import { describe, expect, it } from "vitest";

import { availability, isBookable, seatsLeft } from "@/lib/booking/capacity";
import { MAX_TICKETS_PER_BOOKING, SERVICE_FEE_CAP_CENTS, quote, sessionUnitPrice } from "@/lib/booking/pricing";

const now = new Date("2026-11-02T17:00:00Z");
const later = new Date("2026-11-10T00:00:00Z");

describe("pricing", () => {
  it("adds a 6% service fee to the ticket subtotal", () => {
    expect(quote(9500, 2)).toEqual({ unitPriceCents: 9500, ticketCount: 2, subtotalCents: 19000, serviceFeeCents: 1140, totalCents: 20140 });
  });
  it("caps the service fee at $25", () => {
    const q = quote(18000, 8);
    expect(q.serviceFeeCents).toBe(SERVICE_FEE_CAP_CENTS);
    expect(q.totalCents).toBe(144000 + 2500);
  });
  it("rejects invalid ticket counts and prices", () => {
    expect(() => quote(5000, 0)).toThrow();
    expect(() => quote(5000, MAX_TICKETS_PER_BOOKING + 1)).toThrow();
    expect(() => quote(-1, 1)).toThrow();
    expect(() => quote(10.5, 1)).toThrow();
  });
  it("uses a session price override when present", () => {
    expect(sessionUnitPrice({ priceOverrideCents: 7000 }, { ticketPriceCents: 9000 })).toBe(7000);
    expect(sessionUnitPrice({ priceOverrideCents: null }, { ticketPriceCents: 9000 })).toBe(9000);
  });
});

describe("capacity", () => {
  const s = (capacity: number, seatsReserved: number, extra: Partial<{ startsAt: Date; status: string }> = {}) => ({
    capacity,
    seatsReserved,
    startsAt: later,
    status: "SCHEDULED",
    ...extra,
  });
  it("never reports a full session as available", () => {
    expect(availability(s(12, 12), now)).toBe("SOLD_OUT");
    expect(availability(s(12, 13), now)).toBe("SOLD_OUT");
    expect(seatsLeft(s(12, 13))).toBe(0);
    expect(isBookable(s(12, 12), now)).toBe(false);
  });
  it("flags limited availability at 3 seats or 20%", () => {
    expect(availability(s(12, 9), now)).toBe("LIMITED");
    expect(availability(s(40, 32), now)).toBe("LIMITED");
    expect(availability(s(40, 20), now)).toBe("AVAILABLE");
  });
  it("only books when enough seats remain for the whole party", () => {
    expect(isBookable(s(12, 10), now, 2)).toBe(true);
    expect(isBookable(s(12, 10), now, 3)).toBe(false);
  });
  it("treats started and cancelled sessions as unbookable", () => {
    expect(availability(s(12, 0, { startsAt: now }), now)).toBe("PAST");
    expect(availability(s(12, 0, { status: "CANCELLED" }), now)).toBe("CANCELLED");
  });
});
