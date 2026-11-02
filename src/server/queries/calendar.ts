import "server-only";

import { db } from "@/lib/db";
import { isoDateNY } from "@/lib/format";

export type CalendarItemKind = "booking" | "cancelled" | "saved" | "invitation";

export type CalendarItem = {
  id: string;
  kind: CalendarItemKind;
  date: string; // YYYY-MM-DD in New York
  startsAt: Date;
  title: string;
  href: string;
  detail: string;
  sessionId: string;
};

/** Everything on a guest's personal calendar: bookings (cancelled marked), saved, invitations. */
export async function getCalendarItems(guestId: string, from: Date, to: Date): Promise<CalendarItem[]> {
  const [bookings, saved, invitations] = await Promise.all([
    db.booking.findMany({
      where: { guestId, session: { startsAt: { gte: from, lt: to } } },
      include: { session: { include: { experience: { select: { title: true, slug: true } } } } },
    }),
    db.savedExperience.findMany({
      where: { guestId },
      include: {
        experience: {
          select: { id: true, title: true, slug: true, sessions: { where: { startsAt: { gte: from, lt: to }, status: "SCHEDULED" }, orderBy: { startsAt: "asc" } } },
        },
      },
    }),
    db.eventInvitation.findMany({
      where: { inviteeId: guestId, status: { in: ["PENDING", "ACCEPTED"] }, session: { startsAt: { gte: from, lt: to } } },
      include: { inviter: { select: { displayName: true } }, session: { include: { experience: { select: { title: true } } } } },
    }),
  ]);

  const bookedSessions = new Set(bookings.filter((b) => b.status !== "CANCELLED").map((b) => b.sessionId));
  const items: CalendarItem[] = [];
  for (const b of bookings) {
    items.push({
      id: `b-${b.id}`,
      kind: b.status === "CANCELLED" ? "cancelled" : "booking",
      date: isoDateNY(b.session.startsAt),
      startsAt: b.session.startsAt,
      title: b.session.experience.title,
      href: `/bookings/${b.reference}`,
      detail: b.status === "CANCELLED" ? "Cancelled" : `${b.ticketCount} ticket${b.ticketCount === 1 ? "" : "s"}`,
      sessionId: b.sessionId,
    });
  }
  for (const s of saved) {
    for (const session of s.experience.sessions) {
      if (bookedSessions.has(session.id)) continue;
      items.push({
        id: `s-${session.id}`,
        kind: "saved",
        date: isoDateNY(session.startsAt),
        startsAt: session.startsAt,
        title: s.experience.title,
        href: `/experiences/${s.experience.slug}?session=${session.id}`,
        detail: "Saved",
        sessionId: session.id,
      });
    }
  }
  for (const inv of invitations) {
    items.push({
      id: `i-${inv.id}`,
      kind: "invitation",
      date: isoDateNY(inv.session.startsAt),
      startsAt: inv.session.startsAt,
      title: inv.session.experience.title,
      href: `/invite/${inv.token}`,
      detail: `Invited by ${inv.inviter.displayName.split(" ")[0]}${inv.status === "ACCEPTED" ? " · accepted" : ""}`,
      sessionId: inv.sessionId,
    });
  }
  return items.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

export async function getSharingSettings(guestId: string, now: Date) {
  const [pref, booked] = await Promise.all([
    db.calendarSharingPreference.findUnique({ where: { guestProfileId: guestId }, include: { items: true } }),
    db.booking.findMany({
      where: { guestId, status: "CONFIRMED", session: { startsAt: { gt: now } } },
      include: { session: { include: { experience: { select: { title: true } } } } },
      orderBy: { session: { startsAt: "asc" } },
    }),
  ]);
  const shared = new Set(pref?.items.map((i) => i.sessionId));
  const seen = new Set<string>();
  const sessions = booked
    .filter((b) => (seen.has(b.sessionId) ? false : (seen.add(b.sessionId), true)))
    .map((b) => ({ sessionId: b.sessionId, title: b.session.experience.title, startsAt: b.session.startsAt, shared: shared.has(b.sessionId) }));
  return { pref, sessions };
}

/**
 * Public shared calendar by token. Returns only event-level information for sessions the
 * owner explicitly chose AND still holds a confirmed booking for. Never attendee names,
 * emails, ticket counts or booking references. Revoked tokens return null.
 */
export async function getSharedCalendar(token: string, now: Date) {
  if (!token || token.length < 16) return null;
  const pref = await db.calendarSharingPreference.findUnique({
    where: { shareToken: token },
    include: {
      guestProfile: { select: { displayName: true, id: true } },
      items: {
        include: {
          session: {
            include: {
              experience: { select: { title: true, slug: true, category: true, venue: { select: { neighborhood: true, borough: true } } } },
              bookings: { where: { status: "CONFIRMED" }, select: { guestId: true } },
            },
          },
        },
      },
    },
  });
  if (!pref || pref.visibility === "PRIVATE" || !pref.shareToken) return null;
  const events = pref.items
    .filter((i) => i.session.startsAt > now && i.session.bookings.some((b) => b.guestId === pref.guestProfile.id))
    .sort((a, b) => a.session.startsAt.getTime() - b.session.startsAt.getTime())
    .map((i) => ({
      sessionId: i.sessionId,
      startsAt: i.session.startsAt,
      endsAt: i.session.endsAt,
      title: pref.showExperienceTitles ? i.session.experience.title : "Tastable experience",
      slug: pref.showExperienceTitles ? i.session.experience.slug : null,
      neighborhood: i.session.experience.venue.neighborhood,
      borough: i.session.experience.venue.borough,
    }));
  return { ownerFirstName: pref.guestProfile.displayName.split(" ")[0], events };
}
