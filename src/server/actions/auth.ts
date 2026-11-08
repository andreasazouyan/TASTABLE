"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { HOST_SIGNUP_COOKIE, SESSION_COOKIE, startSession } from "@/lib/auth/demo";
import { dummyHash, hashPassword, verifyPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { logInInput, safeNextPath, signUpInput } from "@/lib/validation/account";

export type AuthFormState = { message?: string; fieldErrors?: Record<string, string[] | undefined>; email?: string; name?: string } | null;

/** Where a guest lands after signing in: the page they came from, else onboarding until it's done or skipped. */
function guestLanding(user: { role: string; guestProfile: { preferences: { onboardingCompletedAt: Date | null; onboardingSkippedAt: Date | null } | null } | null }, next?: string): string {
  if (next) return next;
  if (user.role === "HOST") return "/host";
  const prefs = user.guestProfile?.preferences;
  if (!prefs?.onboardingCompletedAt && !prefs?.onboardingSkippedAt) return "/onboarding";
  return "/";
}

/** Create a real account. Every account gets a guest profile; hosts then set up their host profile. */
export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = Object.fromEntries(formData);
  const parsed = signUpInput.safeParse(raw);
  if (!parsed.success) {
    return {
      message: "Please check the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      email: String(raw.email ?? ""),
      name: String(raw.name ?? ""),
    };
  }
  const { name, email, password, as } = parsed.data;

  if (await db.user.findUnique({ where: { email }, select: { id: true } })) {
    return { fieldErrors: { email: ["An account with this email already exists. Log in instead."] }, email, name };
  }

  const passwordHash = await hashPassword(password);
  let userId: string;
  try {
    const user = await db.user.create({
      data: { name, email, passwordHash, role: "GUEST", isDemo: false, guestProfile: { create: { displayName: name } } },
      select: { id: true },
    });
    userId = user.id;
  } catch (e) {
    // Lost a race with a sign-up for the same email.
    if (e instanceof Error && "code" in e && (e as { code?: string }).code === "P2002") {
      return { fieldErrors: { email: ["An account with this email already exists. Log in instead."] }, email, name };
    }
    throw e;
  }

  await startSession(userId);
  const store = await cookies();
  if (as === "host") {
    store.set(HOST_SIGNUP_COOKIE, "1", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 });
  } else {
    store.delete(HOST_SIGNUP_COOKIE);
  }
  // Guests and hosts alike start with the taste onboarding; hosts continue to host setup after it.
  redirect("/onboarding");
}

/** Log in with email and password. */
export async function logIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = Object.fromEntries(formData);
  const parsed = logInInput.safeParse(raw);
  if (!parsed.success) {
    return { message: "Please check the highlighted fields.", fieldErrors: z.flattenError(parsed.error).fieldErrors, email: String(raw.email ?? "") };
  }
  const { email, password, next } = parsed.data;
  const user = await db.user.findUnique({ where: { email }, include: { guestProfile: { include: { preferences: true } } } });
  const ok = await verifyPassword(password, user?.passwordHash ?? (await dummyHash()));
  if (!user || !user.passwordHash || !ok) return { message: "That email and password don't match an account.", email };

  await startSession(user.id);
  redirect(guestLanding(user, next));
}

/** Demo persona switch: seeded fictional identities only, no password. */
export async function signInAs(formData: FormData) {
  const parsed = z.object({ userId: z.string().min(1), next: safeNextPath }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/sign-in?error=invalid");

  const user = await db.user.findFirst({ where: { id: parsed.data.userId, isDemo: true }, include: { guestProfile: { include: { preferences: true } } } });
  if (!user) redirect("/sign-in?error=unknown");

  await startSession(user.id);
  redirect(guestLanding(user, parsed.data.next));
}

export async function signOut() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(HOST_SIGNUP_COOKIE);
  redirect("/");
}
