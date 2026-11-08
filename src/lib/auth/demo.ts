import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { databaseUrl } from "@/lib/database-url";
import { db } from "@/lib/db";

/**
 * Sessions for both kinds of sign-in:
 * - real accounts (email + password, see src/server/actions/auth.ts and src/lib/auth/password.ts), and
 * - the seeded demo personas, picked on /sign-in without a password.
 * The cookie holds the user id plus an HMAC so it cannot be edited to impersonate someone else.
 */
export const SESSION_COOKIE = "tastable_demo_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

let cachedSecret: string | null = null;

/**
 * The HMAC key. AUTH_SECRET (or the older DEMO_AUTH_SECRET) when set. In production without
 * either, it is derived from the database connection string, which is already a server-only
 * secret, so a fresh Vercel deploy is never signed with a publicly known key.
 */
function secret() {
  if (cachedSecret) return cachedSecret;
  const configured = process.env.AUTH_SECRET || process.env.DEMO_AUTH_SECRET;
  if (configured) return (cachedSecret = configured);
  const dbUrl = databaseUrl();
  if (process.env.NODE_ENV === "production" && dbUrl) {
    return (cachedSecret = createHash("sha256").update(`tastable-session:${dbUrl}`).digest("base64url"));
  }
  return (cachedSecret = "tastable-local-demo-secret");
}

/** Set at sign-up when someone joins as a host: taste onboarding first, then host profile setup. */
export const HOST_SIGNUP_COOKIE = "tastable_signup_host";

/** After guest onboarding: hosts who just signed up continue to host setup (once). Null otherwise. */
export async function takeHostSignupNext(hasHostProfile: boolean): Promise<string | null> {
  const store = await cookies();
  if (!store.get(HOST_SIGNUP_COOKIE)) return null;
  store.delete(HOST_SIGNUP_COOKIE);
  return hasHostProfile ? null : "/host/onboarding";
}

export async function startSession(userId: string) {
  (await cookies()).set(SESSION_COOKIE, encodeSession(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

function sign(userId: string) {
  return createHmac("sha256", secret()).update(userId).digest("base64url");
}

export function encodeSession(userId: string) {
  return `${userId}.${sign(userId)}`;
}

export function decodeSession(value: string | undefined): string | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const userId = value.slice(0, dot);
  const expected = Buffer.from(sign(userId));
  const actual = Buffer.from(value.slice(dot + 1));
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  return userId;
}

/** The signed-in user (real account or demo persona), or null. Reads cookies, so render callers inside <Suspense>. */
export async function getCurrentUser() {
  const store = await cookies();
  const userId = decodeSession(store.get(SESSION_COOKIE)?.value);
  if (!userId) return null;
  return db.user.findUnique({
    where: { id: userId },
    include: { guestProfile: { include: { preferences: true } }, hostProfile: true },
  });
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** Requires a signed-in user with a guest profile; otherwise sends them to sign in. */
export async function requireGuest(next = "/") {
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  if (!user.guestProfile) {
    const profile = await db.guestProfile.create({ data: { userId: user.id, displayName: user.name } });
    return { user, guest: profile };
  }
  return { user, guest: user.guestProfile };
}

/** Requires a signed-in user with a completed host profile. */
export async function requireHost(next = "/host") {
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(next)}&as=host`);
  if (!user.hostProfile) redirect("/host/onboarding");
  return { user, host: user.hostProfile };
}
