import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";

/**
 * DEMO AUTHENTICATION ONLY.
 * People "sign in" by choosing a seeded demo identity. The cookie holds the user id plus an
 * HMAC so it cannot be edited to impersonate someone else. There are no passwords.
 * Replace with real authentication before any production use.
 */
export const SESSION_COOKIE = "tastable_demo_session";

function secret() {
  return process.env.DEMO_AUTH_SECRET || "tastable-local-demo-secret";
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

/** The signed-in demo user, or null. Reads cookies, so render callers inside <Suspense>. */
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

/** Requires a signed-in user with a guest profile; otherwise sends them to pick a demo identity. */
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
