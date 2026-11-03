import type { PrismaClient } from "@/generated/prisma/client";
import { availability, seatsLeft } from "@/lib/booking/capacity";
import { bookingReference, ticketCode } from "@/lib/booking/codes";
import { simulateCharge } from "@/lib/booking/payment";
import { quote, sessionUnitPrice } from "@/lib/booking/pricing";
import { cancellationFee, computeRefund, policySnapshot, type RefundQuote } from "@/lib/booking/refunds";
import { DomainError } from "@/server/services/errors";

type Db = PrismaClient;

export type CreateBookingInput = {
  guestId: string;
  sessionId: string;
  ticketCount: number;
  contactName: string;
  contactEmail: string;
  dietaryRequirements?: string | null;
  attendees?: { name?: string | null; dietaryNotes?: string | null }[];
  acknowledgedPolicy: boolean;
};

/**
 * Books seats with a simulated payment.
 * Overselling is prevented by an atomic conditional UPDATE inside the transaction: the seat
 * counter only increments if the result stays within capacity. The row lock taken by the UPDATE
 * serialises concurrent writers, and the condition makes the check-and-reserve a single statement on any database.
 */
export async function createBooking(db: Db, input: CreateBookingInput, now: Date) {
  if (!input.acknowledgedPolicy) throw new DomainError("Please acknowledge the cancellation policy.");

  return db.$transaction(async (tx) => {
    const session = await tx.experienceSession.findUnique({
      where: { id: input.sessionId },
      include: { experience: { include: { cancellationPolicy: true } } },
    });
    if (!session || session.experience.status !== "PUBLISHED") throw new DomainError("This session is not available.", "NOT_FOUND");

    const state = availability(session, now);
    if (state === "PAST") throw new DomainError("This session has already started.", "CONFLICT");
    if (state === "CANCELLED") throw new DomainError("This session was cancelled.", "CONFLICT");
    if (state === "SOLD_OUT") throw new DomainError("This session is sold out. You can join the waitlist.", "CONFLICT");

    const price = quote(sessionUnitPrice(session, session.experience), input.ticketCount);

    const reserved = await tx.$executeRaw`
      UPDATE "ExperienceSession"
      SET "seatsReserved" = "seatsReserved" + ${input.ticketCount}
      WHERE "id" = ${session.id}
        AND "status" = 'SCHEDULED'
        AND "seatsReserved" + ${input.ticketCount} <= "capacity"`;
    if (reserved !== 1) {
      const left = seatsLeft(session);
      throw new DomainError(
        left > 0 ? `Only ${left} ${left === 1 ? "seat is" : "seats are"} left for this session.` : "This session just sold out.",
        "CONFLICT",
      );
    }

    const charge = simulateCharge(price.totalCents);
    if (!charge.ok) throw new DomainError(`Simulated payment failed: ${charge.reason}`, "PAYMENT_FAILED");

    const policy = session.experience.cancellationPolicy;
    const attendees = input.attendees ?? [];
    const booking = await tx.booking.create({
      data: {
        reference: bookingReference(),
        guestId: input.guestId,
        sessionId: session.id,
        status: "CONFIRMED",
        ticketCount: price.ticketCount,
        unitPriceCents: price.unitPriceCents,
        subtotalCents: price.subtotalCents,
        serviceFeeCents: price.serviceFeeCents,
        totalPriceCents: price.totalCents,
        currency: session.experience.currency,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        dietaryRequirements: input.dietaryRequirements || null,
        policyAcknowledgedAt: now,
        policySnapshot: policySnapshot(policy),
        cancellationPolicyId: policy.id,
        cancellationPolicyVersion: policy.version,
        paymentStatus: "SIMULATED_PAID",
        paymentReference: charge.reference,
        isFictional: false,
        createdAt: now,
        tickets: {
          create: Array.from({ length: price.ticketCount }, (_, i) => ({
            code: ticketCode(),
            attendeeName: i === 0 ? input.contactName : attendees[i]?.name || null,
            dietaryNotes: attendees[i]?.dietaryNotes || null,
          })),
        },
      },
      include: { tickets: true },
    });

    // If the guest was waitlisted for this session, mark the entry converted.
    await tx.waitlistEntry.updateMany({
      where: { sessionId: session.id, guestId: input.guestId, status: { in: ["WAITING", "NOTIFIED"] } },
      data: { status: "CONVERTED" },
    });

    return booking;
  });
}

export type CancellationPreview = RefundQuote & { alreadyCancelled: boolean; releasesSeats: boolean };

async function loadForCancellation(db: Db | Parameters<Parameters<Db["$transaction"]>[0]>[0], bookingId: string) {
  return db.booking.findUnique({
    where: { id: bookingId },
    include: { session: { include: { experience: { include: { cancellationPolicy: true } } } } },
  });
}

/** The exact refund the guest would receive if they cancelled at `now`. */
export async function previewCancellation(db: Db, bookingId: string, guestId: string, now: Date): Promise<CancellationPreview> {
  const booking = await loadForCancellation(db, bookingId);
  if (!booking || booking.guestId !== guestId) throw new DomainError("Booking not found.", "NOT_FOUND");
  const refund = computeRefund(booking, booking.session.experience.cancellationPolicy, booking.session.startsAt, now);
  return {
    ...refund,
    alreadyCancelled: booking.status === "CANCELLED",
    releasesSeats: booking.session.startsAt > now,
  };
}

/**
 * Cancels a booking. Idempotent: repeated requests return the stored result and never
 * refund twice or release seats twice (the status transition is a conditional update).
 */
export async function cancelBooking(
  db: Db,
  args: { bookingId: string; actor: "GUEST" | "HOST" | "SYSTEM"; guestId?: string; hostId?: string; reason?: string },
  now: Date,
) {
  return db.$transaction(async (tx) => {
    const booking = await loadForCancellation(tx, args.bookingId);
    if (!booking) throw new DomainError("Booking not found.", "NOT_FOUND");
    if (args.actor === "GUEST" && booking.guestId !== args.guestId) throw new DomainError("Booking not found.", "NOT_FOUND");
    if (args.actor === "HOST" && booking.session.experience.hostId !== args.hostId) {
      throw new DomainError("You can only cancel bookings for your own events.", "FORBIDDEN");
    }

    if (booking.status === "CANCELLED") {
      return { booking, refundCents: booking.refundAmountCents, alreadyCancelled: true as const };
    }
    if (booking.status !== "CONFIRMED" && booking.status !== "PENDING") {
      throw new DomainError("This booking can no longer be cancelled.", "CONFLICT");
    }

    const refund = computeRefund(
      booking,
      booking.session.experience.cancellationPolicy,
      booking.session.startsAt,
      now,
      args.actor === "GUEST" ? "GUEST" : "HOST",
    );

    const fee = cancellationFee(booking, refund);
    const transitioned = await tx.booking.updateMany({
      where: { id: booking.id, status: booking.status },
      data: {
        status: "CANCELLED",
        cancelledAt: now,
        cancelledBy: args.actor,
        cancellationReason: args.reason ?? null,
        refundAmountCents: refund.refundCents,
        cancellationFeeCents: fee.feeCents,
        cancellationFeePercent: fee.feePercent,
        paymentStatus:
          refund.refundCents === 0
            ? "SIMULATED_PAID"
            : refund.refundCents >= booking.subtotalCents
              ? "SIMULATED_REFUNDED"
              : "SIMULATED_PARTIALLY_REFUNDED",
      },
    });
    if (transitioned.count !== 1) {
      const current = await tx.booking.findUniqueOrThrow({ where: { id: booking.id } });
      return { booking: current, refundCents: current.refundAmountCents, alreadyCancelled: true as const };
    }

    await tx.bookingTicket.updateMany({ where: { bookingId: booking.id }, data: { status: "CANCELLED" } });

    // Release seats only for sessions that have not started yet.
    if (booking.session.startsAt > now) {
      await tx.experienceSession.update({
        where: { id: booking.sessionId },
        data: { seatsReserved: { decrement: booking.ticketCount } },
      });
      // Let the longest-waiting guest know seats opened up (demo: status only, no email).
      const next = await tx.waitlistEntry.findFirst({
        where: { sessionId: booking.sessionId, status: "WAITING" },
        orderBy: { createdAt: "asc" },
      });
      if (next) await tx.waitlistEntry.update({ where: { id: next.id }, data: { status: "NOTIFIED", notifiedAt: now } });
    }

    const updated = await tx.booking.findUniqueOrThrow({ where: { id: booking.id } });
    return { booking: updated, refundCents: refund.refundCents, alreadyCancelled: false as const };
  });
}

/** Joins the waitlist for a sold-out session. Idempotent per guest and session. */
export async function joinWaitlist(db: Db, args: { guestId: string; sessionId: string; partySize: number }, now: Date) {
  const session = await db.experienceSession.findUnique({ where: { id: args.sessionId } });
  if (!session) throw new DomainError("Session not found.", "NOT_FOUND");
  if (availability(session, now) !== "SOLD_OUT") {
    throw new DomainError("This session still has seats, so you can book it directly.", "CONFLICT");
  }
  return db.waitlistEntry.upsert({
    where: { sessionId_guestId: { sessionId: args.sessionId, guestId: args.guestId } },
    create: { sessionId: args.sessionId, guestId: args.guestId, partySize: args.partySize, createdAt: now },
    update: { status: "WAITING", partySize: args.partySize },
  });
}

export async function leaveWaitlist(db: Db, args: { guestId: string; entryId: string }) {
  const entry = await db.waitlistEntry.findUnique({ where: { id: args.entryId } });
  if (!entry || entry.guestId !== args.guestId) throw new DomainError("Waitlist entry not found.", "NOT_FOUND");
  return db.waitlistEntry.update({ where: { id: entry.id }, data: { status: "CANCELLED" } });
}
