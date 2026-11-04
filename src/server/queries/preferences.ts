import "server-only";

import type { AttendancePreference } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { CATEGORY_IDS } from "@/lib/domain/categories";
import { dishLabel } from "@/lib/domain/dishes";
import { parseList } from "@/lib/domain/lists";
import { getNeighborhood } from "@/lib/domain/neighborhoods";
import { DAY_KEYS, onboardingStatus, PREFERENCE_CUISINE_KEYS, TIME_SLOT_KEYS, TRAVEL_MINUTES, type TravelMinutes } from "@/lib/domain/preferences";
import { MOTIVATION_KEYS } from "@/lib/domain/taxonomy";

// ─── Full preference read model ──────────────────────────────────────────────────────────────

/**
 * A guest's preferences as typed values. Unknown or legacy stored values are dropped rather than
 * guessed (e.g. a cuisine key that no longer exists), and nothing is filled in that the guest
 * did not answer.
 */
export function toGuestPreferences(
  p:
    | (Parameters<typeof onboardingStatus>[0] & {
        locationKey: string;
        maxTravelMinutes: number | null;
        preferredDays: string;
        preferredTimes: string;
        attendancePreference: AttendancePreference | null;
        favoriteCategories: string;
        favoriteCuisines: string;
        motivations: string;
        maxBudgetCents: number | null;
        followedHosts: string;
        updatedAt: Date;
        favoriteDishes?: { dishKey: string; customName: string | null; isCustom: boolean; sortOrder: number }[];
      })
    | null
    | undefined,
) {
  const known = <T extends string>(value: string | undefined, keys: readonly T[]) => parseList(value).filter((v): v is T => (keys as readonly string[]).includes(v));
  return {
    status: onboardingStatus(p),
    lastUpdatedAt: p?.updatedAt ?? null,
    locationKey: p && (p.locationKey === "nyc" || getNeighborhood(p.locationKey)) ? p.locationKey : "nyc",
    maxTravelMinutes: (TRAVEL_MINUTES as readonly number[]).includes(p?.maxTravelMinutes ?? -1) ? (p!.maxTravelMinutes as TravelMinutes) : null,
    preferredDays: known(p?.preferredDays, DAY_KEYS),
    preferredTimes: known(p?.preferredTimes, TIME_SLOT_KEYS),
    attendancePreference: p?.attendancePreference ?? null,
    categories: known(p?.favoriteCategories, CATEGORY_IDS),
    cuisines: known(p?.favoriteCuisines, PREFERENCE_CUISINE_KEYS),
    motivations: known(p?.motivations, MOTIVATION_KEYS),
    maxBudgetCents: p?.maxBudgetCents ?? null,
    followedHosts: parseList(p?.followedHosts),
    favoriteDishes: [...(p?.favoriteDishes ?? [])]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((d) => ({ key: d.dishKey, label: dishLabel(d.dishKey, d.customName), isCustom: d.isCustom })),
  };
}
export type GuestPreferencesView = ReturnType<typeof toGuestPreferences>;

export async function getGuestPreferences(guestProfileId: string) {
  const row = await db.guestPreferences.findUnique({ where: { guestProfileId }, include: { favoriteDishes: true } });
  return toGuestPreferences(row);
}
