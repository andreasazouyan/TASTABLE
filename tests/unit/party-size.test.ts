import { describe, expect, it } from "vitest";

import { clampPartySize, partySizeRange, seatsLabel, seatsTotalCents } from "@/lib/booking/party-size";
import { MAX_TICKETS_PER_BOOKING } from "@/lib/booking/pricing";

describe("seat quantity on the booking card", () => {
  it("defaults to 1 and allows up to the seats left", () => {
    expect(partySizeRange(5)).toEqual({ min: 1, max: 5, fixed: false, bookable: true });
  });
  it("never exceeds the per-booking limit", () => {
    expect(partySizeRange(40).max).toBe(MAX_TICKETS_PER_BOOKING);
  });
  it("is not bookable with no seats left", () => {
    expect(partySizeRange(0).bookable).toBe(false);
  });
  it("fixed-size events (Regina's Table) allow exactly that many, and only while enough seats remain", () => {
    expect(partySizeRange(6, { fixed: 2 })).toEqual({ min: 2, max: 2, fixed: true, bookable: true });
    expect(partySizeRange(1, { fixed: 2 }).bookable).toBe(false);
    expect(clampPartySize(5, partySizeRange(6, { fixed: 2 }))).toBe(2);
  });
  it("event caps (Regina's Table: you + 1) limit the maximum", () => {
    expect(partySizeRange(6, { max: 2 }).max).toBe(2);
    expect(partySizeRange(1, { max: 2 }).max).toBe(1);
  });
  it("clamps requested quantities from URLs", () => {
    const r = partySizeRange(3);
    expect(clampPartySize("2", r)).toBe(2);
    expect(clampPartySize("9", r)).toBe(3);
    expect(clampPartySize("0", r)).toBe(1);
    expect(clampPartySize("abc", r)).toBe(1);
    expect(clampPartySize(undefined, r)).toBe(1);
  });
  it("total is price per seat × guests; free stays $0", () => {
    expect(seatsTotalCents(4500, 2)).toBe(9000);
    expect(seatsTotalCents(0, 4)).toBe(0);
  });
  it("labels seats", () => {
    expect(seatsLabel(1)).toBe("1 seat");
    expect(seatsLabel(3)).toBe("3 seats");
  });
});
