import type { PrismaClient } from "@/generated/prisma/client";
import { DomainError } from "@/server/services/errors";

/**
 * In-app reminders (BookingReminder). They are shown inside Tastable only: no email or push
 * service is configured, so nothing is ever "sent" and the UI never claims it was.
 */

/** Reminders due now: 24 hours or less before an upcoming, still-confirmed booking. */
export async function dueReminders(db: PrismaClient, guestId: string, now: Date) {
  return db.bookingReminder.findMany({
    where: {
      status: "SCHEDULED",
      remindAt: { lte: now },
      booking: { guestId, status: "CONFIRMED", session: { status: "SCHEDULED", startsAt: { gt: now } } },
    },
    include: { booking: { select: { reference: true, ticketCount: true, session: { select: { startsAt: true, experience: { select: { title: true } } } } } } },
    orderBy: { remindAt: "asc" },
  });
}

/** Dismisses one of the guest's own reminders. Idempotent. */
export async function dismissReminder(db: PrismaClient, guestId: string, reminderId: string, now: Date) {
  const r = await db.bookingReminder.findUnique({ where: { id: reminderId }, include: { booking: { select: { guestId: true } } } });
  if (!r || r.booking.guestId !== guestId) throw new DomainError("Reminder not found.", "NOT_FOUND");
  await db.bookingReminder.updateMany({ where: { id: reminderId, status: "SCHEDULED" }, data: { status: "DISMISSED", dismissedAt: now } });
}
