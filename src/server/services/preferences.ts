import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { normalizeDishList } from "@/lib/domain/dishes";
import { serializeList } from "@/lib/domain/lists";
import { guestPreferencesPatch, type GuestPreferencesPatch } from "@/lib/validation/preferences";
import { DomainError } from "@/server/services/errors";

type Db = PrismaClient;

/**
 * The single write path for guest preferences (onboarding, profile editing, demo tools).
 *
 * - Validates on the server with guestPreferencesPatch.
 * - Updates the guest's ONE preferences row in place (upsert by guestProfileId), so a guest is
 *   never counted twice in host insights, however often they edit.
 * - Only fields present in the patch change. Favorite dishes are replaced as a set and
 *   normalized (catalog matches, de-duplicated custom entries).
 * - `complete` stamps onboardingCompletedAt (first completion only) and clears a skip.
 */
export async function saveGuestPreferences(
  db: Db,
  guestProfileId: string,
  rawPatch: unknown,
  now: Date,
  opts: { complete?: boolean } = {},
) {
  const parsed = guestPreferencesPatch.safeParse(rawPatch);
  if (!parsed.success) throw new DomainError(parsed.error.issues[0]?.message ?? "Invalid preferences.");
  const p: GuestPreferencesPatch = parsed.data;

  const data: Prisma.GuestPreferencesUncheckedUpdateInput = {};
  if (p.locationKey !== undefined) data.locationKey = p.locationKey;
  if (p.maxTravelMinutes !== undefined) data.maxTravelMinutes = p.maxTravelMinutes;
  if (p.preferredDays !== undefined) data.preferredDays = serializeList(p.preferredDays);
  if (p.preferredTimes !== undefined) data.preferredTimes = serializeList(p.preferredTimes);
  if (p.attendancePreference !== undefined) data.attendancePreference = p.attendancePreference;
  if (p.categories !== undefined) data.favoriteCategories = serializeList(p.categories);
  if (p.cuisines !== undefined) data.favoriteCuisines = serializeList(p.cuisines);
  if (p.motivations !== undefined) data.motivations = serializeList(p.motivations);
  if (p.maxBudgetCents !== undefined) data.maxBudgetCents = p.maxBudgetCents;

  const dishes = p.favoriteDishes === undefined ? undefined : normalizeDishList(p.favoriteDishes);

  return db.$transaction(async (tx) => {
    const existing = await tx.guestPreferences.findUnique({ where: { guestProfileId }, select: { id: true, onboardingCompletedAt: true } });
    if (opts.complete) {
      data.onboardingCompletedAt = existing?.onboardingCompletedAt ?? now;
      data.onboardingSkippedAt = null;
    }
    // Touch updatedAt even when only dishes change, so "last updated" is truthful.
    data.updatedAt = now;

    const prefs = existing
      ? await tx.guestPreferences.update({ where: { guestProfileId }, data })
      : await tx.guestPreferences.create({ data: { ...(data as Prisma.GuestPreferencesUncheckedCreateInput), guestProfileId } });

    if (dishes !== undefined) {
      await tx.guestFavoriteDish.deleteMany({ where: { preferencesId: prefs.id } });
      if (dishes.length) {
        await tx.guestFavoriteDish.createMany({
          data: dishes.map((d, i) => ({ preferencesId: prefs.id, dishKey: d.dishKey, customName: d.customName, isCustom: d.isCustom, sortOrder: i, createdAt: now })),
        });
      }
    }
    return tx.guestPreferences.findUniqueOrThrow({ where: { id: prefs.id }, include: { favoriteDishes: { orderBy: { sortOrder: "asc" } } } });
  });
}

/** Marks onboarding skipped without touching any answers. Never overrides a completed onboarding. */
export async function skipGuestOnboarding(db: Db, guestProfileId: string, now: Date) {
  return db.guestPreferences.upsert({
    where: { guestProfileId },
    create: { guestProfileId, onboardingSkippedAt: now },
    update: { onboardingSkippedAt: now },
  });
}
