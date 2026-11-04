import { describe, expect, it } from "vitest";

import { hostRefundCents } from "@/lib/analytics/finance";
import {
  STANDARD_LATE_FEE_TERMS,
  formatTimeRemaining,
  lateFeeCents,
  quoteCancellation,
  reminderTime,
  termsFromSnapshot,
  termsSnapshot,
} from "@/lib/booking/cancellation";
import { quote } from "@/lib/booking/pricing";
import { bookingToIcs } from "@/lib/calendar/booking-events";
import { buildIcs } from "@/lib/calendar/ics";

const start = new Date("2026-11-20T00:30:00Z"); // Thu Nov 19, 7:30 PM New York
const before = (h: number, m = 0) => new Date(start.getTime() - (h * 60 + m) * 60_000);
const booking = (unitDollars: number, tickets = 1) => {
  const p = quote(unitDollars * 100, tickets);
  return { subtotalCents: p.subtotalCents, serviceFeeCents: p.serviceFeeCents, totalPriceCents: p.totalCents };
};

describe("25% late-cancellation fee (integer cents)", () => {
  it("is 25% of the ticket subtotal: $80 → $20, $100 → $25, $200 → $50", () => {
    expect(lateFeeCents(8000)).toBe(2000);
    expect(lateFeeCents(10000)).toBe(2500);
    expect(lateFeeCents(20000)).toBe(5000);
    expect(lateFeeCents(3333)).toBe(833); // rounds to whole cents
  });

  it("uses the whole subtotal for multiple tickets and excludes the service fee", () => {
    const b = booking(50, 4); // 4 × $50 = $200 subtotal + service fee
    expect(b.serviceFeeCents).toBeGreaterThan(0);
    const q = quoteCancellation(b, STANDARD_LATE_FEE_TERMS, start, before(23));
    expect(q.feeCents).toBe(5000);
    expect(q.refundCents).toBe(b.totalPriceCents - 5000);
  });

  for (const [dollars, fee] of [
    [80, 2000],
    [100, 2500],
    [200, 5000],
  ] as const) {
    it(`$${dollars}: free at 25h and at exactly 24h, $${fee / 100} fee at 23h, not cancellable after the start`, () => {
      const b = booking(dollars);
      const at25 = quoteCancellation(b, STANDARD_LATE_FEE_TERMS, start, before(25));
      expect(at25).toMatchObject({ allowed: true, onTime: true, feePercent: 0, feeCents: 0, refundCents: b.totalPriceCents });

      const at24 = quoteCancellation(b, STANDARD_LATE_FEE_TERMS, start, before(24));
      expect(at24).toMatchObject({ onTime: true, feeCents: 0, refundCents: b.totalPriceCents });

      const justUnder = quoteCancellation(b, STANDARD_LATE_FEE_TERMS, start, new Date(before(24).getTime() + 1000));
      expect(justUnder.feeCents).toBe(fee);

      const at23 = quoteCancellation(b, STANDARD_LATE_FEE_TERMS, start, before(23));
      expect(at23).toMatchObject({ allowed: true, onTime: false, feePercent: 25, feeCents: fee, refundCents: b.totalPriceCents - fee });
      // The fee is kept from what was paid: fee + refund is exactly what was paid, never more.
      expect(at23.feeCents + at23.refundCents).toBe(b.totalPriceCents);

      const after = quoteCancellation(b, STANDARD_LATE_FEE_TERMS, start, new Date(start.getTime() + 60_000));
      expect(after.allowed).toBe(false);
      expect(quoteCancellation(b, STANDARD_LATE_FEE_TERMS, start, start).allowed).toBe(false);
    });
  }

  it("host cancellations always refund everything", () => {
    const b = booking(100, 2);
    expect(quoteCancellation(b, STANDARD_LATE_FEE_TERMS, start, before(2), "HOST")).toMatchObject({ feeCents: 0, refundCents: b.totalPriceCents });
  });

  it("host finances keep exactly the fee on a late guest cancellation", () => {
    const b = booking(100);
    const q = quoteCancellation(b, STANDARD_LATE_FEE_TERMS, start, before(5));
    expect(hostRefundCents({ subtotalCents: b.subtotalCents, refundAmountCents: q.refundCents, cancellationFeeCents: q.feeCents })).toBe(7500);
    // Older rows without a recorded fee keep the previous rule.
    expect(hostRefundCents({ subtotalCents: 10000, refundAmountCents: 5000 })).toBe(5000);
  });
});

describe("terms stored with each booking", () => {
  const legacyPolicy = { name: "Standard (48 hours)", fullRefundHours: 48, partialRefundHours: 24, partialRefundPercent: 50 };

  it("round-trips the late-fee snapshot", () => {
    expect(termsFromSnapshot(termsSnapshot(STANDARD_LATE_FEE_TERMS), legacyPolicy)).toEqual(STANDARD_LATE_FEE_TERMS);
  });

  it("older snapshots stay tiered (no retroactive change)", () => {
    const terms = termsFromSnapshot(JSON.stringify(legacyPolicy), { ...legacyPolicy, lateFeePercent: 25 });
    expect(terms.kind).toBe("TIERED");
    const q = quoteCancellation(booking(100), terms, start, before(30));
    expect(q.refundCents).toBe(5000); // the 50% tier they agreed to
  });
});

describe("reminders", () => {
  it("fire 24 hours before the start and show time remaining", () => {
    expect(reminderTime(start).toISOString()).toBe("2026-11-19T00:30:00.000Z");
    expect(formatTimeRemaining(25 * 3_600_000)).toBe("1 day 1 hr");
    expect(formatTimeRemaining(23 * 3_600_000 + 59 * 60_000)).toBe("23 hr 59 min");
    expect(formatTimeRemaining(45 * 60_000)).toBe("45 min");
    expect(formatTimeRemaining(0)).toBeNull();
  });

  it("booking .ics files carry a 24-hour VALARM; cancelled ones don't", () => {
    const b = {
      id: "b1",
      reference: "TBL-TEST",
      status: "CONFIRMED",
      ticketCount: 2,
      session: {
        startsAt: start,
        endsAt: new Date(start.getTime() + 3 * 3_600_000),
        experience: { title: "Test Supper", slug: "test", venue: { name: "Room", neighborhood: "SoHo", addressLine: "1 Sample St", isSecretLocation: false } },
      },
    };
    const ics = buildIcs([bookingToIcs(b, "https://example.com")], { name: "t", now: start });
    expect(ics).toContain("BEGIN:VALARM\r\nACTION:DISPLAY\r\n");
    expect(ics).toContain("TRIGGER:-PT24H\r\nEND:VALARM\r\nEND:VEVENT");
    const cancelled = buildIcs([bookingToIcs({ ...b, status: "CANCELLED" }, "https://example.com")], { name: "t", now: start });
    expect(cancelled).not.toContain("VALARM");
  });
});
