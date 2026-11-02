"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/demo";
import { serverNow } from "@/lib/clock";
import { db } from "@/lib/db";
import { serializeList } from "@/lib/domain/lists";
import { preferencesFromFormData } from "@/lib/validation/preferences";

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
