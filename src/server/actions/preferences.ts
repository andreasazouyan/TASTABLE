"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/demo";
import { serverNow } from "@/lib/clock";
import { db } from "@/lib/db";
import { serializeList } from "@/lib/domain/lists";
import { preferencesFromFormData, type GuestPreferencesPatch } from "@/lib/validation/preferences";
import { DomainError } from "@/server/services/errors";
import { saveGuestPreferences } from "@/server/services/preferences";

export type PrefsState = { ok: boolean; message: string } | null;

async function guestId() {
  const user = await getCurrentUser();
  if (!user?.guestProfile) redirect("/sign-in?next=/onboarding");
  return user.guestProfile.id;
}

async function persist(id: string, fd: FormData, mark: "draft" | "complete") {
  const parsed = preferencesFromFormData(fd);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid preferences" };
  const p = parsed.data;
  const data = {
    locationKey: p.locationKey,
    travelRadiusMiles: p.locationKey === "nyc" ? null : p.travelRadiusMiles,
    favoriteCuisines: serializeList(p.cuisines),
    favoriteCategories: serializeList(p.categories),
    motivations: serializeList(p.motivations),
    maxBudgetCents: p.maxBudgetDollars === null ? null : p.maxBudgetDollars * 100,
    ...(mark === "complete" ? { onboardingCompletedAt: serverNow(), onboardingSkippedAt: null } : {}),
  };
  await db.guestPreferences.upsert({ where: { guestProfileId: id }, create: { guestProfileId: id, ...data }, update: data });
  revalidatePath("/");
  revalidatePath("/profile");
  return { ok: true, message: "Preferences saved." };
}

/** Saves progress after each onboarding step, so a reload resumes where you left off. */
export async function saveOnboardingStep(fd: FormData) {
  await persist(await guestId(), fd, "draft");
}

export async function completeOnboarding(fd: FormData) {
  const result = await persist(await guestId(), fd, "complete");
  if (result.ok) redirect("/?welcome=1");
}

export async function skipOnboarding() {
  const id = await guestId();
  await db.guestPreferences.upsert({
    where: { guestProfileId: id },
    create: { guestProfileId: id, onboardingSkippedAt: serverNow() },
    update: { onboardingSkippedAt: serverNow() },
  });
  revalidatePath("/");
  redirect("/discover");
}

export async function updatePreferences(_prev: PrefsState, fd: FormData): Promise<PrefsState> {
  return persist(await guestId(), fd, "complete");
}

// ─── Onboarding v2 (six pages) and profile editing: typed patches through the preferences service ──

export type SaveAnswersResult = { ok: true } | { ok: false; message: string };

async function savePatch(patch: GuestPreferencesPatch, complete: boolean): Promise<SaveAnswersResult> {
  const id = await guestId();
  try {
    await saveGuestPreferences(db, id, patch, serverNow(), { complete });
  } catch (e) {
    if (e instanceof DomainError) return { ok: false, message: e.message };
    throw e;
  }
  revalidatePath("/");
  revalidatePath("/profile");
  revalidatePath("/profile/preferences");
  return { ok: true };
}

/** Saves one onboarding page's answers (only the fields it sends). */
export async function saveOnboardingAnswers(patch: GuestPreferencesPatch): Promise<SaveAnswersResult> {
  return savePatch(patch, false);
}

/** Saves the last page and marks onboarding complete, then shows recommendations. */
export async function finishOnboarding(patch: GuestPreferencesPatch): Promise<SaveAnswersResult> {
  const result = await savePatch(patch, true);
  if (result.ok) redirect("/?welcome=1");
  return result;
}
