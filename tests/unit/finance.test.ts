import { describe, expect, it } from "vitest";

import { computeFinancials, occupancy, revenueSeries, sessionPerformance, type FinanceBooking } from "@/lib/analytics/finance";

const d = (iso: string) => new Date(iso);
const b = (over: Partial<FinanceBooking>): FinanceBooking => ({
  id: Math.random().toString(36),
  status: "CONFIRMED",
  ticketCount: 2,
  subtotalCents: 20000,
  serviceFeeCents: 1200,
  refundAmountCents: 0,
  createdAt: d("2026-10-20T15:00:00Z"),
  sessionId: "s1",
  ...over,
});

describe("host finances", () => {
  const bookings = [
    b({}),
    b({ ticketCount: 1, subtotalCents: 10000, serviceFeeCents: 600 }),
    // Cancelled with a 50% refund: ticket revenue stays in gross, half comes back as a refund.
    b({ status: "CANCELLED", subtotalCents: 10000, refundAmountCents: 5000, ticketCount: 1 }),
    // Host cancellation refunds fees too; only the ticket part comes out of host revenue.
    b({ status: "CANCELLED", subtotalCents: 10000, serviceFeeCents: 600, refundAmountCents: 10600, ticketCount: 1 }),
    // Pending bookings are not money yet.
    b({ status: "PENDING", subtotalCents: 99999 }),
  ];
  const expenses = [
    { amountCents: 8000, incurredAt: d("2026-10-21"), category: "INGREDIENTS", experienceId: "e1", sessionId: "s1" },
    { amountCents: 2000, incurredAt: d("2026-10-21"), category: "STAFF", experienceId: "e1", sessionId: null },
  ];
  const f = computeFinancials(bookings, expenses);

  it("computes gross, refunds, platform fees, expenses and profit", () => {
    expect(f.grossRevenueCents).toBe(50000);
    expect(f.refundsCents).toBe(15000);
    expect(f.platformFeesCents).toBe(3500); // 10% of 35,000
    expect(f.estimatedNetRevenueCents).toBe(31500);
    expect(f.expensesCents).toBe(10000);
    expect(f.estimatedProfitCents).toBe(21500);
    expect(f.profitMargin).toBeCloseTo(0.43);
  });
  it("counts tickets, cancellations and average price", () => {
    expect(f.ticketsSold).toBe(3);
    expect(f.bookings).toBe(4);
    expect(f.cancellationRate).toBe(0.5);
    expect(f.averageTicketPriceCents).toBe(10000);
  });
  it("returns nulls rather than dividing by zero", () => {
    const empty = computeFinancials([], []);
    expect(empty.profitMargin).toBeNull();
    expect(empty.cancellationRate).toBeNull();
    expect(empty.averageTicketPriceCents).toBeNull();
    expect(occupancy([])).toBeNull();
  });
  it("ignores cancelled sessions in occupancy", () => {
    expect(
      occupancy([
        { capacity: 10, seatsReserved: 8, status: "COMPLETED" },
        { capacity: 10, seatsReserved: 0, status: "CANCELLED" },
      ]),
    ).toBe(0.8);
  });
  it("builds per-session performance", () => {
    const [p] = sessionPerformance(
      [{ id: "s1", experienceId: "e1", experienceTitle: "Dinner", startsAt: d("2026-10-25T23:00:00Z"), capacity: 12, seatsReserved: 3, status: "COMPLETED" }],
      bookings,
      expenses,
    );
    expect(p.ticketsSold).toBe(3);
    expect(p.cancellations).toBe(2);
    expect(p.revenueCents).toBe(35000);
    expect(p.expensesCents).toBe(8000);
  });
  it("buckets revenue by booking date", () => {
    const series = revenueSeries(bookings, d("2026-10-19T04:00:00Z"), d("2026-10-26T04:00:00Z"));
    expect(series).toHaveLength(7);
    expect(series.reduce((s, x) => s + x.revenue, 0)).toBe(350);
    expect(series.reduce((s, x) => s + x.bookings, 0)).toBe(4);
  });
});
