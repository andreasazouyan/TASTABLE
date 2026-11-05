import { MAX_TICKETS_PER_BOOKING } from "@/lib/booking/pricing";

/**
 * How many seats a guest can reserve in one booking, from the seats left on a session and the
 * event's own booking rule. `fixed` events (e.g. Regina's Table, pairs only) allow exactly that
 * many seats, and can't be booked at all once fewer remain.
 */
export type PartySizeRule = { fixed?: number };

export type PartySizeRange = { min: number; max: number; fixed: boolean; bookable: boolean };

export function partySizeRange(seatsLeft: number, rule: PartySizeRule = {}): PartySizeRange {
  const left = Math.max(0, Math.floor(seatsLeft));
  if (rule.fixed) return { min: rule.fixed, max: rule.fixed, fixed: true, bookable: left >= rule.fixed };
  const max = Math.min(MAX_TICKETS_PER_BOOKING, left);
  return { min: 1, max: Math.max(1, max), fixed: false, bookable: max >= 1 };
}

/** Clamps a requested quantity (e.g. from a URL) into the allowed range; junk falls back to the minimum. */
export function clampPartySize(requested: unknown, range: PartySizeRange) {
  const n = typeof requested === "number" ? requested : Number.parseInt(String(requested ?? ""), 10);
  if (!Number.isFinite(n)) return range.min;
  return Math.min(range.max, Math.max(range.min, Math.trunc(n)));
}

export function seatsLabel(n: number) {
  return `${n} ${n === 1 ? "seat" : "seats"}`;
}

/** Card total: price per seat × number of guests (fees, if any, are added at checkout). */
export function seatsTotalCents(unitPriceCents: number, seats: number) {
  return Math.max(0, unitPriceCents) * seats;
}
