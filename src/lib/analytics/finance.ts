import { PLATFORM_FEE_RATE } from "@/lib/booking/pricing";

/**
 * Host finance math. Pure functions over database rows, so every KPI is derived from
 * bookings and expenses rather than stored numbers.
 *
 *   Gross ticket revenue   = ticket subtotals of paid bookings (service fees go to the platform)
 * − Refunds                = ticket portion refunded to guests
 * − Platform fees          = PLATFORM_FEE_RATE × (gross − refunds)
 * − Recorded expenses
 * = Estimated profit        (an estimate, NOT a cash payout: payouts are simulated)
 */
export type FinanceBooking = {
  id: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  ticketCount: number;
  subtotalCents: number;
  serviceFeeCents: number;
  refundAmountCents: number;
  /** Ticket-subtotal share kept on cancellation (null when not cancelled or unrecorded). */
  cancellationFeeCents?: number | null;
  createdAt: Date;
  sessionId: string;
};

export type FinanceExpense = { amountCents: number; incurredAt: Date; category: string; experienceId: string; sessionId: string | null };

export type FinanceSession = {
  id: string;
  experienceId: string;
  experienceTitle: string;
  startsAt: Date;
  capacity: number;
  seatsReserved: number;
  status: string;
};

/**
 * The part of a refund that came out of the host's ticket revenue. When a cancellation fee is
 * recorded, the host keeps exactly that fee (the rest of the ticket subtotal is refunded; any
 * service fee refunded comes from the platform). Otherwise the refund is capped at the subtotal.
 */
export function hostRefundCents(b: Pick<FinanceBooking, "refundAmountCents" | "subtotalCents" | "cancellationFeeCents">) {
  if (b.cancellationFeeCents !== null && b.cancellationFeeCents !== undefined && b.refundAmountCents > 0) return Math.max(b.subtotalCents - b.cancellationFeeCents, 0);
  return Math.min(b.refundAmountCents, b.subtotalCents);
}

export function isPaid(b: Pick<FinanceBooking, "status">) {
  return b.status === "CONFIRMED" || b.status === "COMPLETED" || b.status === "CANCELLED";
}

export function inRange(d: Date, from: Date, to: Date) {
  return d >= from && d < to;
}

export function computeFinancials(bookings: FinanceBooking[], expenses: FinanceExpense[]) {
  const paid = bookings.filter(isPaid);
  const gross = paid.reduce((s, b) => s + b.subtotalCents, 0);
  const refunds = paid.reduce((s, b) => s + hostRefundCents(b), 0);
  const netTicket = gross - refunds;
  const platformFees = Math.round(netTicket * PLATFORM_FEE_RATE);
  const expenseTotal = expenses.reduce((s, e) => s + e.amountCents, 0);
  const estimatedNetRevenue = netTicket - platformFees;
  const estimatedProfit = estimatedNetRevenue - expenseTotal;

  const active = paid.filter((b) => b.status !== "CANCELLED");
  const cancelled = paid.filter((b) => b.status === "CANCELLED");
  const ticketsSold = active.reduce((s, b) => s + b.ticketCount, 0);
  const allTickets = paid.reduce((s, b) => s + b.ticketCount, 0);

  return {
    grossRevenueCents: gross,
    refundsCents: refunds,
    platformFeesCents: platformFees,
    expensesCents: expenseTotal,
    estimatedNetRevenueCents: estimatedNetRevenue,
    estimatedProfitCents: estimatedProfit,
    /** Profit as a share of gross ticket revenue. Null when there is no revenue. */
    profitMargin: gross > 0 ? estimatedProfit / gross : null,
    ticketsSold,
    bookings: paid.length,
    cancellations: cancelled.length,
    cancellationRate: paid.length ? cancelled.length / paid.length : null,
    averageTicketPriceCents: allTickets ? Math.round(gross / allTickets) : null,
  };
}

export function occupancy(sessions: Pick<FinanceSession, "capacity" | "seatsReserved" | "status">[]) {
  const live = sessions.filter((s) => s.status !== "CANCELLED");
  const capacity = live.reduce((s, x) => s + x.capacity, 0);
  const reserved = live.reduce((s, x) => s + x.seatsReserved, 0);
  return capacity ? reserved / capacity : null;
}

export type SessionPerformance = {
  sessionId: string;
  experienceId: string;
  event: string;
  startsAt: Date;
  status: string;
  capacity: number;
  ticketsSold: number;
  occupancy: number;
  revenueCents: number;
  refundsCents: number;
  cancellations: number;
  expensesCents: number;
};

export function sessionPerformance(
  sessions: FinanceSession[],
  bookings: FinanceBooking[],
  expenses: FinanceExpense[],
): SessionPerformance[] {
  return sessions.map((s) => {
    const bs = bookings.filter((b) => b.sessionId === s.id && isPaid(b));
    const active = bs.filter((b) => b.status !== "CANCELLED");
    const refunds = bs.reduce((sum, b) => sum + hostRefundCents(b), 0);
    return {
      sessionId: s.id,
      experienceId: s.experienceId,
      event: s.experienceTitle,
      startsAt: s.startsAt,
      status: s.status,
      capacity: s.capacity,
      ticketsSold: active.reduce((sum, b) => sum + b.ticketCount, 0),
      occupancy: s.capacity ? s.seatsReserved / s.capacity : 0,
      revenueCents: bs.reduce((sum, b) => sum + b.subtotalCents, 0) - refunds,
      refundsCents: refunds,
      cancellations: bs.length - active.length,
      expensesCents: expenses.filter((e) => e.sessionId === s.id).reduce((sum, e) => sum + e.amountCents, 0),
    };
  });
}

/** Daily (or weekly for long ranges) revenue and booking series for charts. */
export function revenueSeries(bookings: FinanceBooking[], from: Date, to: Date) {
  const days = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86_400_000));
  const bucketDays = days > 45 ? 7 : 1;
  const buckets: { start: Date; label: string; revenue: number; bookings: number; cancellations: number }[] = [];
  for (let t = from.getTime(); t < to.getTime(); t += bucketDays * 86_400_000) {
    const start = new Date(t);
    buckets.push({
      start,
      label: start.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" }),
      revenue: 0,
      bookings: 0,
      cancellations: 0,
    });
  }
  for (const b of bookings.filter(isPaid)) {
    if (!inRange(b.createdAt, from, to)) continue;
    const idx = Math.min(buckets.length - 1, Math.floor((b.createdAt.getTime() - from.getTime()) / (bucketDays * 86_400_000)));
    buckets[idx].revenue += (b.subtotalCents - hostRefundCents(b)) / 100;
    buckets[idx].bookings += 1;
    if (b.status === "CANCELLED") buckets[idx].cancellations += 1;
  }
  return buckets.map(({ label, revenue, bookings: n, cancellations }) => ({
    label,
    revenue: Math.round(revenue),
    bookings: n,
    cancellations,
  }));
}
