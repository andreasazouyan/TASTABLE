"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/demo";
import { serverNow } from "@/lib/clock";
import { db } from "@/lib/db";
import type { GuestPreferencesPatch } from "@/lib/validation/preferences";
import { DomainError } from "@/server/services/errors";
import { saveGuestPreferences } from "@/server/services/preferences";

async function guestId() {
  const user = await getCurrentUser();
  if (!user?.guestProfile) redirect("/sign-in?next=/onboarding");
  return user.guestProfile.id;
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

/** My Preferences (profile): saves every answer at once and counts as completed onboarding. */
export async function savePreferencesFromProfile(patch: GuestPreferencesPatch): Promise<SaveAnswersResult> {
  return savePatch(patch, true);
}
