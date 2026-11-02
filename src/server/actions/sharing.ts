"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/demo";
import { shareToken } from "@/lib/booking/codes";
import { serverNow } from "@/lib/clock";
import { db } from "@/lib/db";

export type InviteState = { ok: boolean; message: string; link?: string } | null;

const inviteSchema = z.object({
  bookingId: z.string().min(1),
  inviteeEmail: z.email("Enter your friend's email"),
  inviteeName: z.string().trim().max(60).optional().default(""),
  message: z.string().trim().max(280).optional().default(""),
});

/** Invite a friend to a booked session. Creates a private, non-guessable invitation link. */
export async function inviteFriendAction(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const user = await getCurrentUser();
  if (!user?.guestProfile) return { ok: false, message: "Sign in to invite friends." };
  const parsed = inviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { bookingId, inviteeEmail, inviteeName, message } = parsed.data;

  const booking = await db.booking.findUnique({ where: { id: bookingId }, include: { session: true } });
  if (!booking || booking.guestId !== user.guestProfile.id || booking.status !== "CONFIRMED") {
    return { ok: false, message: "You can only invite friends to your own confirmed bookings." };
  }
  if (inviteeEmail.toLowerCase() === user.email.toLowerCase()) return { ok: false, message: "That's your own email." };

  const invitee = await db.user.findUnique({ where: { email: inviteeEmail.toLowerCase() }, include: { guestProfile: true } });
  const token = shareToken();
  await db.eventInvitation.upsert({
    where: { sessionId_inviterId_inviteeEmail: { sessionId: booking.sessionId, inviterId: user.guestProfile.id, inviteeEmail: inviteeEmail.toLowerCase() } },
    create: {
      sessionId: booking.sessionId,
      inviterId: user.guestProfile.id,
      bookingId: booking.id,
      inviteeEmail: inviteeEmail.toLowerCase(),
      inviteeName: inviteeName || null,
      inviteeId: invitee?.guestProfile?.id ?? null,
      message: message || null,
      token,
      expiresAt: booking.session.startsAt,
      createdAt: serverNow(),
    },
    update: { message: message || null, inviteeName: inviteeName || null, status: "PENDING" },
  });
  const saved = await db.eventInvitation.findUniqueOrThrow({
    where: { sessionId_inviterId_inviteeEmail: { sessionId: booking.sessionId, inviterId: user.guestProfile.id, inviteeEmail: inviteeEmail.toLowerCase() } },
  });
  revalidatePath("/calendar");
  return { ok: true, message: "Invitation created. No email is sent in the demo: share this link with your friend.", link: `/invite/${saved.token}` };
}

export async function respondToInvitationAction(formData: FormData) {
  const { token, response } = z.object({ token: z.string().min(10), response: z.enum(["ACCEPTED", "DECLINED"]) }).parse(Object.fromEntries(formData));
  const user = await getCurrentUser();
  if (!user?.guestProfile) redirect(`/sign-in?next=/invite/${token}`);
  const invitation = await db.eventInvitation.findUnique({ where: { token } });
  if (!invitation) redirect("/");
  if (invitation.inviterId === user.guestProfile.id) redirect(`/invite/${token}`);
  await db.eventInvitation.update({
    where: { token },
    data: { status: response, respondedAt: serverNow(), inviteeId: invitation.inviteeId ?? user.guestProfile.id },
  });
  revalidatePath("/calendar");
  redirect(`/invite/${token}`);
}

// ─── Calendar sharing ─────────────────────────────────────────────────────────

async function guestOrRedirect() {
  const user = await getCurrentUser();
  if (!user?.guestProfile) redirect("/sign-in?next=/calendar");
  return user.guestProfile;
}

/** Turns on a public shared calendar with a fresh non-guessable token. Nothing is shown until items are chosen. */
export async function enableCalendarSharing() {
  const guest = await guestOrRedirect();
  const now = serverNow();
  await db.calendarSharingPreference.upsert({
    where: { guestProfileId: guest.id },
    create: { guestProfileId: guest.id, visibility: "PUBLIC", shareToken: shareToken(), sharedAt: now },
    update: { visibility: "PUBLIC", shareToken: shareToken(), sharedAt: now, revokedAt: null },
  });
  revalidatePath("/calendar");
}

/** Revokes sharing: the old link stops working immediately and the token is discarded. */
export async function revokeCalendarSharing() {
  const guest = await guestOrRedirect();
  await db.calendarSharingPreference.updateMany({
    where: { guestProfileId: guest.id },
    data: { visibility: "PRIVATE", shareToken: null, revokedAt: serverNow() },
  });
  revalidatePath("/calendar");
}

export async function setShowTitles(formData: FormData) {
  const guest = await guestOrRedirect();
  await db.calendarSharingPreference.updateMany({ where: { guestProfileId: guest.id }, data: { showExperienceTitles: formData.get("show") === "on" } });
  revalidatePath("/calendar");
}

/** Adds or removes one of the guest's own booked sessions from their shared calendar. */
export async function toggleSharedSession(formData: FormData) {
  const guest = await guestOrRedirect();
  const sessionId = z.string().min(1).parse(formData.get("sessionId"));
  const owns = await db.booking.findFirst({ where: { guestId: guest.id, sessionId, status: { in: ["CONFIRMED", "COMPLETED"] } } });
  if (!owns) return; // can only share sessions you actually booked
  const pref = await db.calendarSharingPreference.upsert({
    where: { guestProfileId: guest.id },
    create: { guestProfileId: guest.id },
    update: {},
  });
  const key = { preferenceId_sessionId: { preferenceId: pref.id, sessionId } };
  const existing = await db.calendarShareItem.findUnique({ where: key });
  if (existing) await db.calendarShareItem.delete({ where: key });
  else await db.calendarShareItem.create({ data: { preferenceId: pref.id, sessionId } });
  revalidatePath("/calendar");
}
