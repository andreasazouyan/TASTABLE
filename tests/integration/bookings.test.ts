import { describe, expect, it } from "vitest";

import { seatsLeft } from "@/lib/booking/capacity";
import { serverNow } from "@/lib/clock";
import { db } from "@/lib/db";
import { getListingsByIds } from "@/server/queries/listings";
import { applyFilters, parseFilters } from "@/lib/discovery/filters";
import { cancelBooking, createBooking, joinWaitlist, previewCancellation } from "@/server/services/bookings";

const now = serverNow();
const guest = "gst_jordan";
const input = (sessionId: string, ticketCount: number, guestId = guest) => ({
  guestId,
  sessionId,
  ticketCount,
  contactName: "Jordan Test",
  contactEmail: "jordan@example.com",
  acknowledgedPolicy: true,
});

async function openSession(minLeft: number, minHoursAhead = 72) {
  const sessions = await db.experienceSession.findMany({
    where: { status: "SCHEDULED", startsAt: { gt: new Date(now.getTime() + minHoursAhead * 3_600_000) }, experience: { status: "PUBLISHED" } },
    include: { experience: { include: { cancellationPolicy: true } } },
    orderBy: { startsAt: "asc" },
  });
  const s = sessions.find((x) => seatsLeft(x) >= minLeft && x.experience.cancellationPolicy.key === "STANDARD_48H");
  if (!s) throw new Error("no open session in seed");
  return s;
}

describe("booking service (simulated payments, seeded test DB)", () => {
  it("books tickets, updates seats and stores a simulated payment", async () => {
    const s = await openSession(2);
    const booking = await createBooking(db, input(s.id, 2), now);
    expect(booking.status).toBe("CONFIRMED");
    expect(booking.tickets).toHaveLength(2);
    expect(booking.paymentReference).toMatch(/^sim_/);
    expect(booking.reference).toMatch(/^TBL-/);
    expect(booking.totalPriceCents).toBe(booking.subtotalCents + booking.serviceFeeCents);
    const after = await db.experienceSession.findUniqueOrThrow({ where: { id: s.id } });
    expect(after.seatsReserved).toBe(s.seatsReserved + 2);
  });

  it("never oversells, even with concurrent requests for the last seats", async () => {
    const s = await openSession(3);
    // Leave exactly 3 seats.
    await db.experienceSession.update({ where: { id: s.id }, data: { seatsReserved: s.capacity - 3 } });
    const attempts = await Promise.allSettled([createBooking(db, input(s.id, 2), now), createBooking(db, input(s.id, 2), now), createBooking(db, input(s.id, 2), now)]);
    const ok = attempts.filter((a) => a.status === "fulfilled");
    expect(ok).toHaveLength(1);
    const after = await db.experienceSession.findUniqueOrThrow({ where: { id: s.id } });
    expect(after.seatsReserved).toBeLessThanOrEqual(after.capacity);
    expect(after.seatsReserved).toBe(after.capacity - 1);
    await expect(createBooking(db, input(s.id, 2), now)).rejects.toThrow(/Only 1 seat is left/);
  });

  it("rejects bookings for sold-out sessions and offers the waitlist", async () => {
    const s = await openSession(1);
    await db.experienceSession.update({ where: { id: s.id }, data: { seatsReserved: s.capacity } });
    await expect(createBooking(db, input(s.id, 1), now)).rejects.toThrow(/sold out/i);
    const entry = await joinWaitlist(db, { guestId: "gst_alex", sessionId: s.id, partySize: 2 }, now);
    expect(entry.status).toBe("WAITING");
  });

  it("requires the policy acknowledgement", async () => {
    const s = await openSession(1);
    await expect(createBooking(db, { ...input(s.id, 1), acknowledgedPolicy: false }, now)).rejects.toThrow(/acknowledge/);
  });

  it("shows the exact refund before cancelling, then cancels idempotently", async () => {
    const s = await openSession(2);
    const booking = await createBooking(db, input(s.id, 2), now);
    const preview = await previewCancellation(db, booking.id, guest, now);
    expect(preview).toMatchObject({ onTime: true, feeCents: 0, refundCents: booking.totalPriceCents });

    const first = await cancelBooking(db, { bookingId: booking.id, actor: "GUEST", guestId: guest }, now);
    expect(first.alreadyCancelled).toBe(false);
    expect(first.refundCents).toBe(preview.refundCents);
    const seatsAfterFirst = (await db.experienceSession.findUniqueOrThrow({ where: { id: s.id } })).seatsReserved;

    const [second, third] = await Promise.all([
      cancelBooking(db, { bookingId: booking.id, actor: "GUEST", guestId: guest }, now),
      cancelBooking(db, { bookingId: booking.id, actor: "GUEST", guestId: guest }, now),
    ]);
    expect(second.alreadyCancelled).toBe(true);
    expect(third.alreadyCancelled).toBe(true);
    expect(second.refundCents).toBe(first.refundCents);
    const seatsAfterRepeat = (await db.experienceSession.findUniqueOrThrow({ where: { id: s.id } })).seatsReserved;
    expect(seatsAfterRepeat).toBe(seatsAfterFirst);
    const tickets = await db.bookingTicket.findMany({ where: { bookingId: booking.id } });
    expect(tickets.every((t) => t.status === "CANCELLED")).toBe(true);
  });

  it("new bookings: free 24h+ before, 25% of the subtotal later, kept from the payment, never after the start", async () => {
    const s = await openSession(3);
    const b = await createBooking(db, input(s.id, 3), now);
    expect(b.cancellationPolicyId).toBe("pol_late_fee_24h_25");
    expect(JSON.parse(b.policySnapshot)).toMatchObject({ kind: "LATE_FEE", freeCancellationHours: 24, lateFeePercent: 25 });
    const reminder = await db.bookingReminder.findUniqueOrThrow({ where: { bookingId: b.id } });
    expect(reminder.remindAt.getTime()).toBe(s.startsAt.getTime() - 24 * 3_600_000);

    const at = (h: number) => new Date(s.startsAt.getTime() - h * 3_600_000);
    expect((await previewCancellation(db, b.id, guest, at(25))).feeCents).toBe(0);
    expect((await previewCancellation(db, b.id, guest, at(24))).feeCents).toBe(0);
    const late = await previewCancellation(db, b.id, guest, at(23));
    expect(late.feeCents).toBe(Math.round(b.subtotalCents * 0.25));
    await expect(cancelBooking(db, { bookingId: b.id, actor: "GUEST", guestId: guest }, new Date(s.startsAt.getTime() + 60_000))).rejects.toThrow(/already started/);

    const seatsBefore = (await db.experienceSession.findUniqueOrThrow({ where: { id: s.id } })).seatsReserved;
    const r = await cancelBooking(db, { bookingId: b.id, actor: "GUEST", guestId: guest }, at(23));
    expect(r.refundCents).toBe(b.totalPriceCents - late.feeCents);
    expect(r.booking).toMatchObject({ status: "CANCELLED", cancellationFeeCents: late.feeCents, cancellationFeePercent: 25, refundAmountCents: b.totalPriceCents - late.feeCents, paymentStatus: "SIMULATED_PARTIALLY_REFUNDED" });
    expect((await db.experienceSession.findUniqueOrThrow({ where: { id: s.id } })).seatsReserved).toBe(seatsBefore - 3);
    expect((await db.bookingTicket.findMany({ where: { bookingId: b.id } })).every((t) => t.status === "CANCELLED")).toBe(true);
    expect((await db.bookingReminder.findUniqueOrThrow({ where: { bookingId: b.id } })).status).toBe("CANCELLED");

    // Idempotent: a repeat never charges the fee twice or changes the refund.
    const again = await cancelBooking(db, { bookingId: b.id, actor: "GUEST", guestId: guest }, at(1));
    expect(again.alreadyCancelled).toBe(true);
    expect(again.booking.cancellationFeeCents).toBe(late.feeCents);
    expect(again.refundCents).toBe(r.refundCents);
  });

  it("a later policy change never alters an existing booking's terms", async () => {
    const s = await openSession(1);
    const b = await createBooking(db, input(s.id, 1), now);
    await db.cancellationPolicy.update({ where: { id: "pol_late_fee_24h_25" }, data: { lateFeePercent: 50, version: { increment: 1 } } });
    try {
      const p = await previewCancellation(db, b.id, guest, new Date(s.startsAt.getTime() - 2 * 3_600_000));
      expect(p.feePercent).toBe(25);
    } finally {
      await db.cancellationPolicy.update({ where: { id: "pol_late_fee_24h_25" }, data: { lateFeePercent: 25, version: 1 } });
    }
  });

  it("bookings made before the new policy keep their tiered terms (50% between 24 and 48 hours)", async () => {
    const legacy = await db.booking.findFirstOrThrow({
      where: { status: "CONFIRMED", cancellationPolicy: { key: "STANDARD_48H" }, session: { startsAt: { gt: new Date(now.getTime() + 72 * 3_600_000) } } },
      include: { session: true },
    });
    const thirtyHoursBefore = new Date(legacy.session.startsAt.getTime() - 30 * 3_600_000);
    const r = await cancelBooking(db, { bookingId: legacy.id, actor: "GUEST", guestId: legacy.guestId }, thirtyHoursBefore);
    expect(r.refundCents).toBe(Math.round(legacy.subtotalCents / 2));
    expect(r.booking.paymentStatus).toBe("SIMULATED_PARTIALLY_REFUNDED");
  });

  it("does not let another guest cancel or preview someone else's booking", async () => {
    const s = await openSession(1);
    const booking = await createBooking(db, input(s.id, 1), now);
    await expect(cancelBooking(db, { bookingId: booking.id, actor: "GUEST", guestId: "gst_alex" }, now)).rejects.toThrow(/not found/i);
    await expect(previewCancellation(db, booking.id, "gst_alex", now)).rejects.toThrow(/not found/i);
  });
});

describe("discovery filters over seeded listings", () => {
  it("never shows a sold-out session as available and honours the spots filter", async () => {
    const ids = (await db.experience.findMany({ where: { status: "PUBLISHED" }, select: { id: true } })).map((x) => x.id);
    const listings = await getListingsByIds(ids, now);
    for (const l of listings) for (const s of l.sessions) if (s.seatsLeft === 0) expect(s.availability).toBe("SOLD_OUT");

    const withSpots = applyFilters(listings, parseFilters({ spots: "4" }), now);
    expect(withSpots.length).toBeGreaterThan(0);
    expect(withSpots.every((m) => m.matched!.seatsLeft >= 4)).toBe(true);

    const classes = applyFilters(listings, parseFilters({ category: "classes", maxPrice: "100" }), now);
    expect(classes.every((m) => m.category === "COOKING_CLASS_WORKSHOP" && m.matched!.priceCents <= 10000)).toBe(true);

    const sorted = applyFilters(listings, parseFilters({ sort: "price-asc" }), now).map((m) => m.matched!.priceCents);
    expect(sorted).toEqual([...sorted].sort((a, b) => a - b));
  });
});
