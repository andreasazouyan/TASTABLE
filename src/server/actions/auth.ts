"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { SESSION_COOKIE, encodeSession } from "@/lib/auth/demo";
import { db } from "@/lib/db";

/** Demo persona who hasn't set preferences yet (see src/lib/domain/personas.ts). */
const FRESH_PERSONA_ID = "usr_alex";

const safePath = z
  .string()
  .startsWith("/")
  .refine((p) => !p.startsWith("//"))
  .optional()
  .catch(undefined);

/** Demo identity switch. No passwords and no real accounts. */
export async function signInAs(formData: FormData) {
  const parsed = z.object({ userId: z.string().min(1), next: safePath }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/sign-in?error=invalid");

  const user = await db.user.findFirst({ where: { id: parsed.data.userId, isDemo: true }, include: { guestProfile: { include: { preferences: true } } } });
  if (!user) redirect("/sign-in?error=unknown");

  (await cookies()).set(SESSION_COOKIE, encodeSession(user.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  // The "just moved to New York" persona always starts from a blank slate, so every visitor of the
  // shared demo can walk through onboarding (otherwise the first person to finish it would hide it).
  if (user.id === FRESH_PERSONA_ID && user.role !== "HOST" && !parsed.data.next && user.guestProfile) {
    const guestProfileId = user.guestProfile.id;
    await db.$transaction([
      db.guestPreferences.deleteMany({ where: { guestProfileId } }),
      db.guestPreferences.create({ data: { guestProfileId } }),
    ]);
    redirect("/onboarding");
  }

  if (parsed.data.next) redirect(parsed.data.next);
  if (user.role === "HOST") redirect("/host");
  const prefs = user.guestProfile?.preferences;
  if (!prefs?.onboardingCompletedAt && !prefs?.onboardingSkippedAt) redirect("/onboarding");
  redirect("/");
}

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/");
}
