import type { PrismaClient } from "@/generated/prisma/client";
import {
  REGINA_PARTY_SIZE,
  REGINA_SEEDED_BOOKING_PREFIX,
  REGINA_SESSION_ID,
  reginaMainLabel,
} from "@/lib/domain/reginas-table";
import type { ReginaReservationInput } from "@/lib/validation/reginas-table";
import { createBooking } from "@/server/services/bookings";
import { DomainError } from "@/server/services/errors";

type Db = PrismaClient;

/**
 * Reserves Regina's Table for two (the guest and a +1) with a main course each. Free ($0), so no
 * simulated charge is made. Seats are reserved atomically by createBooking; a guest can hold only
 * one reservation, so a double submission can never book twice.
 */
export async function reserveReginasTable(db: Db, guestId: string, input: ReginaReservationInput, now: Date) {
  if (input.sessionId !== REGINA_SESSION_ID) throw new DomainError("This reservation is only for Regina's Table.", "CONFLICT");
  const mains = [reginaMainLabel(input.mainGuest), reginaMainLabel(input.mainPlusOne)];
  if (mains.some((m) => !m)) throw new DomainError("Choose a main course for each guest.");
  return createBooking(
    db,
    {
      guestId,
      sessionId: input.sessionId,
      ticketCount: REGINA_PARTY_SIZE,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      dietaryRequirements: input.dietaryRequirements,
      attendees: [
        { name: input.contactName, mealChoice: mains[0] },
        { name: input.plusOneName || null, mealChoice: mains[1] },
      ],
      acknowledgedPolicy: true,
      onePerGuest: true,
    },
    now,
  );
}

/** The signed-in guest's active reservation for Regina's Table, if any. */
export function findReginaReservation(db: Db, guestId: string) {
  return db.booking.findFirst({
    where: { sessionId: REGINA_SESSION_ID, guestId, status: { in: ["CONFIRMED", "PENDING"] } },
    select: { reference: true },
  });
}

/**
 * Developer-only reset: removes every reservation made during the demo (bookings, tickets,
 * reminders, reviews and invitations tied to them, plus waitlist entries) and restores the seat
 * count from the seeded guest list, so 6 seats are left again. Seeded bookings and every other
 * event are untouched.
 */
export async function resetReginasTableDemo(db: Db) {
  return db.$transaction(async (tx) => {
    const session = await tx.experienceSession.findUnique({ where: { id: REGINA_SESSION_ID } });
    if (!session) throw new DomainError("Regina's Table isn't in this database yet. Run npm run demo:regina.", "NOT_FOUND");
    const demo = await tx.booking.findMany({
      where: { sessionId: REGINA_SESSION_ID, NOT: { id: { startsWith: REGINA_SEEDED_BOOKING_PREFIX } } },
      select: { id: true },
    });
    const ids = demo.map((b) => b.id);
    await tx.eventInvitation.deleteMany({ where: { sessionId: REGINA_SESSION_ID, bookingId: { in: ids } } });
    await tx.booking.deleteMany({ where: { id: { in: ids } } }); // tickets, reminders and reviews cascade
    await tx.waitlistEntry.deleteMany({ where: { sessionId: REGINA_SESSION_ID } });
    const kept = await tx.booking.aggregate({
      where: { sessionId: REGINA_SESSION_ID, status: { in: ["CONFIRMED", "PENDING"] } },
      _sum: { ticketCount: true },
    });
    const seatsReserved = kept._sum.ticketCount ?? 0;
    await tx.experienceSession.update({ where: { id: REGINA_SESSION_ID }, data: { seatsReserved, status: "SCHEDULED" } });
    return { removed: ids.length, seatsLeft: session.capacity - seatsReserved };
  });
}
