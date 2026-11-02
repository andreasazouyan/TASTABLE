"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { SESSION_COOKIE, encodeSession } from "@/lib/auth/demo";
import { db } from "@/lib/db";

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
