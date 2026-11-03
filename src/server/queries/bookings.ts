import "server-only";

import { db } from "@/lib/db";

const bookingInclude = {
  tickets: { orderBy: { createdAt: "asc" } },
  review: { select: { id: true } },
  session: {
    include: {
      experience: {
        include: {
          venue: true,
          host: { select: { displayName: true, slug: true } },
          cancellationPolicy: true,
          photos: { take: 1, orderBy: { sortOrder: "asc" } },
        },
      },
    },
  },
} as const;

export type GuestBooking = Awaited<ReturnType<typeof getGuestBookings>>[number];

export async function getGuestBookings(guestId: string) {
  return db.booking.findMany({ where: { guestId }, include: bookingInclude, orderBy: { session: { startsAt: "asc" } } });
}

export async function getBookingByReference(reference: string, guestId: string) {
  const booking = await db.booking.findUnique({ where: { reference }, include: bookingInclude });
  // Only the booking owner may see it. Everyone else gets "not found" (no existence leak).
  if (!booking || booking.guestId !== guestId) return null;
  return booking;
}

export type BookingView = "upcoming" | "past" | "cancelled" | "waitlist" | "invitations";

export function splitBookings(bookings: GuestBooking[], now: Date) {
  return {
    upcoming: bookings.filter((b) => b.status !== "CANCELLED" && b.session.endsAt > now),
    past: bookings.filter((b) => b.status !== "CANCELLED" && b.session.endsAt <= now).reverse(),
    cancelled: bookings.filter((b) => b.status === "CANCELLED").sort((a, b) => (b.cancelledAt?.getTime() ?? 0) - (a.cancelledAt?.getTime() ?? 0)),
  };
}

export async function getWaitlist(guestId: string) {
  return db.waitlistEntry.findMany({
    where: { guestId, status: { in: ["WAITING", "NOTIFIED"] } },
    include: { session: { include: { experience: { select: { title: true, slug: true, venue: { select: { neighborhood: true } } } } } } },
    orderBy: { createdAt: "desc" },
  });
}

/** Position in the queue among guests still waiting (1-based). */
export async function waitlistPosition(sessionId: string, createdAt: Date) {
  const ahead = await db.waitlistEntry.count({ where: { sessionId, status: "WAITING", createdAt: { lt: createdAt } } });
  return ahead + 1;
}

export async function getReceivedInvitations(guestId: string) {
  return db.eventInvitation.findMany({
    where: { inviteeId: guestId },
    include: {
      inviter: { select: { displayName: true } },
      session: { include: { experience: { select: { title: true, slug: true, venue: { select: { neighborhood: true } } } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}
