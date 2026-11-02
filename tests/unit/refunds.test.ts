import { describe, expect, it } from "vitest";

import { computeRefund } from "@/lib/booking/refunds";

const policy = { name: "Standard", fullRefundHours: 48, partialRefundHours: 24, partialRefundPercent: 50 };
const booking = { subtotalCents: 19000, serviceFeeCents: 1140 };
const start = new Date("2026-11-10T00:00:00Z");
const hoursBefore = (h: number) => new Date(start.getTime() - h * 3_600_000);

describe("refund policy (full >48h, 50% 24–48h, none <24h)", () => {
  it("refunds the full ticket subtotal more than 48h before", () => {
    const r = computeRefund(booking, policy, start, hoursBefore(48.01));
    expect(r.tier).toBe("FULL");
    expect(r.refundCents).toBe(19000); // service fee is not refunded on guest cancellation
  });
  it("gives 50% at exactly 48h (boundary belongs to the lower tier)", () => {
    const r = computeRefund(booking, policy, start, hoursBefore(48));
    expect(r.tier).toBe("PARTIAL");
    expect(r.refundCents).toBe(9500);
  });
  it("gives 50% between 24 and 48 hours", () => {
    expect(computeRefund(booking, policy, start, hoursBefore(30)).refundCents).toBe(9500);
  });
  it("gives nothing at exactly 24h and within 24h", () => {
    expect(computeRefund(booking, policy, start, hoursBefore(24)).refundCents).toBe(0);
    expect(computeRefund(booking, policy, start, hoursBefore(2)).tier).toBe("NONE");
  });
  it("gives nothing once the session has started", () => {
    const r = computeRefund(booking, policy, start, hoursBefore(-1));
    expect(r.refundCents).toBe(0);
    expect(r.explanation).toMatch(/already started/);
  });
  it("refunds everything including fees when the host cancels", () => {
    const r = computeRefund(booking, policy, start, hoursBefore(1), "HOST");
    expect(r.refundCents).toBe(20140);
  });
  it("supports policies without a partial tier", () => {
    const flexible = { name: "Flexible", fullRefundHours: 24, partialRefundHours: null, partialRefundPercent: 0 };
    expect(computeRefund(booking, flexible, start, hoursBefore(25)).refundCents).toBe(19000);
    expect(computeRefund(booking, flexible, start, hoursBefore(23)).refundCents).toBe(0);
  });
});
