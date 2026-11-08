import { cancellationFee, computeRefund, type PolicyTerms } from "@/lib/booking/refunds";

/**
 * Cancellation terms, accepted per booking and stored as a snapshot on the booking
 * (Booking.policySnapshot). A booking is always cancelled under the terms it was made with, so a
 * later policy change never alters an existing booking.
 *
 * New bookings use Tastable's standard terms (LATE_FEE): cancelling at least 24 hours before the
 * start is free; later than that, 25% of the ticket subtotal is retained (separately itemized
 * platform fees are not part of the fee base). The fee is kept from the amount already paid and
 * the remainder is refunded, so it can never be charged twice.
 *
 * Bookings made before this policy keep their tiered refund terms (TIERED, see refunds.ts).
 */

export const LATE_FEE_POLICY_KEY = "LATE_FEE_24H_25";
export const LATE_FEE_HOURS = 24;
export const LATE_FEE_PERCENT = 25;

export const CHECKOUT_POLICY_NOTICE = "Cancellations made less than 24 hours before the event are subject to a fee of 25% of the ticket subtotal.";
export const BOOKED_POLICY_NOTICE = "Please note: Cancelling less than 24 hours before this event will incur a 25% cancellation fee.";

export type LateFeeTerms = { kind: "LATE_FEE"; name: string; freeCancellationHours: number; lateFeePercent: number };
export type TieredTerms = { kind: "TIERED" } & PolicyTerms;
export type BookingTerms = LateFeeTerms | TieredTerms;

export const STANDARD_LATE_FEE_TERMS: LateFeeTerms = {
  kind: "LATE_FEE",
  name: "Tastable standard: free cancellation until 24 hours before",
  freeCancellationHours: LATE_FEE_HOURS,
  lateFeePercent: LATE_FEE_PERCENT,
};

/** Policy row → terms. A row with lateFeePercent set is a late-fee policy; otherwise tiered. */
export function termsFromPolicy(p: PolicyTerms & { lateFeePercent?: number | null }): BookingTerms {
  if (p.lateFeePercent !== null && p.lateFeePercent !== undefined) {
    return { kind: "LATE_FEE", name: p.name, freeCancellationHours: p.fullRefundHours, lateFeePercent: p.lateFeePercent };
  }
  return { kind: "TIERED", name: p.name, fullRefundHours: p.fullRefundHours, partialRefundHours: p.partialRefundHours, partialRefundPercent: p.partialRefundPercent };
}

export function termsSnapshot(t: BookingTerms) {
  return JSON.stringify(t);
}

/**
 * The terms a booking was made under, from its stored snapshot. Snapshots written before
 * versioning have no `kind` and are tiered. Falls back to `fallback` (the event's policy at
 * booking time) only if the snapshot is unreadable.
 */
export function termsFromSnapshot(snapshot: string | null | undefined, fallback: PolicyTerms & { lateFeePercent?: number | null }): BookingTerms {
  try {
    const s = JSON.parse(snapshot ?? "");
    if (s?.kind === "LATE_FEE" && Number.isInteger(s.freeCancellationHours) && Number.isInteger(s.lateFeePercent)) {
      return { kind: "LATE_FEE", name: String(s.name ?? STANDARD_LATE_FEE_TERMS.name), freeCancellationHours: s.freeCancellationHours, lateFeePercent: s.lateFeePercent };
    }
    if (Number.isInteger(s?.fullRefundHours)) {
      return {
        kind: "TIERED",
        name: String(s.name ?? fallback.name),
        fullRefundHours: s.fullRefundHours,
        partialRefundHours: s.partialRefundHours ?? null,
        partialRefundPercent: s.partialRefundPercent ?? 0,
      };
    }
  } catch {
    // fall through
  }
  return termsFromPolicy(fallback);
}

/** The late-cancellation fee for a ticket subtotal, in integer cents (half-up rounding). */
export function lateFeeCents(subtotalCents: number, percent = LATE_FEE_PERCENT) {
  return Math.round((subtotalCents * percent) / 100);
}

export type CancellationQuote = {
  /** False when the guest can no longer cancel (the event has started under late-fee terms). */
  allowed: boolean;
  onTime: boolean;
  feePercent: number;
  feeCents: number;
  refundCents: number;
  msUntilStart: number;
  explanation: string;
};

/**
 * What cancelling right now would cost. Exactly `freeCancellationHours` before the start counts
 * as on time. Host and system cancellations always refund everything with no fee.
 */
export function quoteCancellation(
  booking: { subtotalCents: number; serviceFeeCents: number; totalPriceCents: number },
  terms: BookingTerms,
  startsAt: Date,
  now: Date,
  actor: "GUEST" | "HOST" | "SYSTEM" = "GUEST",
): CancellationQuote {
  const msUntilStart = startsAt.getTime() - now.getTime();
  if (actor !== "GUEST") {
    return { allowed: true, onTime: true, feePercent: 0, feeCents: 0, refundCents: booking.totalPriceCents, msUntilStart, explanation: "The host cancelled, so the full amount including fees is refunded." };
  }
  if (terms.kind === "LATE_FEE") {
    if (msUntilStart <= 0) {
      return { allowed: false, onTime: false, feePercent: 0, feeCents: 0, refundCents: 0, msUntilStart, explanation: "This event has already started, so the booking can no longer be cancelled." };
    }
    const onTime = msUntilStart >= terms.freeCancellationHours * 3_600_000;
    const feeCents = onTime ? 0 : lateFeeCents(booking.subtotalCents, terms.lateFeePercent);
    return {
      allowed: true,
      onTime,
      feePercent: onTime ? 0 : terms.lateFeePercent,
      feeCents,
      refundCents: booking.totalPriceCents - feeCents,
      msUntilStart,
      explanation: onTime
        ? `You're cancelling at least ${terms.freeCancellationHours} hours before the start, so there's no cancellation fee and everything you paid is refunded.`
        : `You're cancelling less than ${terms.freeCancellationHours} hours before the start, so ${terms.lateFeePercent}% of the ticket subtotal is kept as a cancellation fee and the rest is refunded.`,
    };
  }
  // Older bookings: the tiered terms they were made with (service fee non-refundable).
  const refund = computeRefund(booking, terms, startsAt, now);
  const fee = cancellationFee(booking, refund);
  return {
    allowed: true,
    onTime: refund.tier === "FULL",
    feePercent: fee.feePercent,
    feeCents: fee.feeCents,
    refundCents: refund.refundCents,
    msUntilStart,
    explanation: `${refund.explanation} This booking was made under the earlier "${terms.name}" terms.`,
  };
}

/** Plain-language summary of the terms (event page, checkout, ticket). */
export function describeTerms(terms: BookingTerms): string[] {
  if (terms.kind === "LATE_FEE") {
    return [
      `Free cancellation until ${terms.freeCancellationHours} hours before the start.`,
      `Cancellations made less than ${terms.freeCancellationHours} hours before the event are subject to a fee of ${terms.lateFeePercent}% of the ticket subtotal.`,
      "Bookings can't be cancelled once the event has started.",
    ];
  }
  const lines = [`Full ticket refund if you cancel more than ${terms.fullRefundHours} hours before the start.`];
  if (terms.partialRefundHours !== null && terms.partialRefundPercent > 0) {
    lines.push(`${terms.partialRefundPercent}% refund between ${terms.partialRefundHours} and ${terms.fullRefundHours} hours before.`);
    lines.push(`No refund within ${terms.partialRefundHours} hours of the start.`);
  } else lines.push(`No refund within ${terms.fullRefundHours} hours of the start.`);
  lines.push("The service fee is non-refundable unless the host cancels.");
  return lines;
}

/** "1 day 1 hr", "23 hr 59 min", "45 min" — or null once the event has started. */
export function formatTimeRemaining(ms: number) {
  if (ms <= 0) return null;
  const totalMin = Math.floor(ms / 60_000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  const parts = [days ? `${days} ${days === 1 ? "day" : "days"}` : "", hours ? `${hours} hr` : "", !days && mins ? `${mins} min` : ""].filter(Boolean);
  return parts.join(" ") || "less than a minute";
}

/** When the in-app reminder fires: 24 hours before the start. */
export function reminderTime(startsAt: Date) {
  return new Date(startsAt.getTime() - 24 * 3_600_000);
}
