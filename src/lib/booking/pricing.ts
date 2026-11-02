/**
 * Checkout pricing. All values are integer cents. Simulated: nothing is charged.
 *
 * Guest service fee: 6% of the ticket subtotal, rounded to the nearest cent, capped at $25.
 * Host platform fee:  10% of ticket revenue the host keeps (after refunds). See finance.ts.
 */
export const SERVICE_FEE_RATE = 0.06;
export const SERVICE_FEE_CAP_CENTS = 2500;
export const PLATFORM_FEE_RATE = 0.1;
export const MAX_TICKETS_PER_BOOKING = 8;

export type PriceQuote = {
  unitPriceCents: number;
  ticketCount: number;
  subtotalCents: number;
  serviceFeeCents: number;
  totalCents: number;
};

export function quote(unitPriceCents: number, ticketCount: number): PriceQuote {
  if (!Number.isInteger(unitPriceCents) || unitPriceCents < 0) throw new Error("Invalid unit price");
  if (!Number.isInteger(ticketCount) || ticketCount < 1 || ticketCount > MAX_TICKETS_PER_BOOKING) {
    throw new Error(`Ticket count must be between 1 and ${MAX_TICKETS_PER_BOOKING}`);
  }
  const subtotalCents = unitPriceCents * ticketCount;
  const serviceFeeCents = Math.min(Math.round(subtotalCents * SERVICE_FEE_RATE), SERVICE_FEE_CAP_CENTS);
  return { unitPriceCents, ticketCount, subtotalCents, serviceFeeCents, totalCents: subtotalCents + serviceFeeCents };
}

/** Effective ticket price for a session (session override wins). */
export function sessionUnitPrice(session: { priceOverrideCents: number | null }, experience: { ticketPriceCents: number }) {
  return session.priceOverrideCents ?? experience.ticketPriceCents;
}
