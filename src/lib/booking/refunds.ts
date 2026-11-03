/**
 * Refund calculation. Pure and deterministic: callers pass the server clock's `now`.
 *
 * Example standard policy (STANDARD_48H):
 *   more than 48h before start  -> 100% of ticket subtotal
 *   24h to 48h before start     -> 50%
 *   within 24h                  -> 0%
 * The guest service fee is non-refundable on guest cancellations and fully refunded when
 * the host cancels (host cancellations always refund 100% of the total).
 */
export type PolicyTerms = {
  name: string;
  fullRefundHours: number;
  partialRefundHours: number | null;
  partialRefundPercent: number;
};

export type RefundQuote = {
  tier: "FULL" | "PARTIAL" | "NONE" | "HOST_CANCELLED";
  percent: number;
  refundCents: number;
  hoursBeforeStart: number;
  explanation: string;
};

export function hoursUntil(startsAt: Date, now: Date) {
  return (startsAt.getTime() - now.getTime()) / 3_600_000;
}

export function computeRefund(
  booking: { subtotalCents: number; serviceFeeCents: number },
  policy: PolicyTerms,
  startsAt: Date,
  now: Date,
  actor: "GUEST" | "HOST" = "GUEST",
): RefundQuote {
  const hours = hoursUntil(startsAt, now);
  if (actor === "HOST") {
    return {
      tier: "HOST_CANCELLED",
      percent: 100,
      refundCents: booking.subtotalCents + booking.serviceFeeCents,
      hoursBeforeStart: hours,
      explanation: "The host cancelled, so the full amount including fees is refunded.",
    };
  }
  if (hours > policy.fullRefundHours) {
    return {
      tier: "FULL",
      percent: 100,
      refundCents: booking.subtotalCents,
      hoursBeforeStart: hours,
      explanation: `Cancelled more than ${policy.fullRefundHours} hours before the start: full ticket refund. The service fee is non-refundable.`,
    };
  }
  if (policy.partialRefundHours !== null && hours > policy.partialRefundHours && policy.partialRefundPercent > 0) {
    return {
      tier: "PARTIAL",
      percent: policy.partialRefundPercent,
      refundCents: Math.round((booking.subtotalCents * policy.partialRefundPercent) / 100),
      hoursBeforeStart: hours,
      explanation: `Cancelled ${policy.partialRefundHours}–${policy.fullRefundHours} hours before the start: ${policy.partialRefundPercent}% of the ticket price is refunded.`,
    };
  }
  return {
    tier: "NONE",
    percent: 0,
    refundCents: 0,
    hoursBeforeStart: hours,
    explanation:
      hours <= 0
        ? "This session has already started, so it can no longer be refunded."
        : `Cancelled within ${policy.partialRefundHours ?? policy.fullRefundHours} hours of the start: no refund.`,
  };
}

/** Plain-language tiers for display at checkout and on event pages. */
export function describePolicy(policy: PolicyTerms): string[] {
  const lines = [`Full refund if you cancel more than ${policy.fullRefundHours} hours before the start.`];
  if (policy.partialRefundHours !== null && policy.partialRefundPercent > 0) {
    lines.push(
      `${policy.partialRefundPercent}% refund between ${policy.partialRefundHours} and ${policy.fullRefundHours} hours before.`,
    );
    lines.push(`No refund within ${policy.partialRefundHours} hours of the start.`);
  } else {
    lines.push(`No refund within ${policy.fullRefundHours} hours of the start.`);
  }
  lines.push("The service fee is non-refundable unless the host cancels.");
  return lines;
}

export function policySnapshot(policy: PolicyTerms) {
  return JSON.stringify({
    name: policy.name,
    fullRefundHours: policy.fullRefundHours,
    partialRefundHours: policy.partialRefundHours,
    partialRefundPercent: policy.partialRefundPercent,
  });
}

/**
 * The cancellation fee implied by a refund quote: the share of the TICKET SUBTOTAL that is kept.
 * The service fee is itemized separately and is not part of this fee. Host and system
 * cancellations never carry a fee. Integer cents; percent is 0–100.
 */
export function cancellationFee(booking: { subtotalCents: number }, refund: Pick<RefundQuote, "tier" | "refundCents">) {
  if (refund.tier === "HOST_CANCELLED" || booking.subtotalCents <= 0) return { feeCents: 0, feePercent: 0 };
  const ticketRefund = Math.min(refund.refundCents, booking.subtotalCents);
  const feeCents = Math.max(booking.subtotalCents - ticketRefund, 0);
  return { feeCents, feePercent: Math.round((feeCents * 100) / booking.subtotalCents) };
}
