"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { cancelBookingAction, type CancelState } from "@/server/actions/bookings";

/** Two-step cancellation: show the time left, fee and refund first, then confirm explicitly. */
export function CancelPanel({
  bookingId,
  refundLabel,
  paidLabel,
  feeLabel,
  feePercent,
  timeRemaining,
  explanation,
  calculatedAt,
}: {
  bookingId: string;
  refundLabel: string;
  paidLabel: string;
  feeLabel: string;
  feePercent: number;
  timeRemaining: string;
  explanation: string;
  calculatedAt: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [state, action, pending] = useActionState<CancelState, FormData>(cancelBookingAction, null);

  if (state?.ok) {
    return (
      <p role="status" className="rounded-xl bg-muted p-4 text-sm">
        {state.message}
      </p>
    );
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)} className="w-full sm:w-auto">
        Cancel booking…
      </Button>
    );
  }

  return (
    <form action={action} className="space-y-4 rounded-2xl border border-destructive/30 bg-card p-5" aria-labelledby="cancel-title">
      <input type="hidden" name="bookingId" value={bookingId} />
      <h3 id="cancel-title" className="text-lg">
        Cancel this booking?
      </h3>
      <dl className="space-y-1.5 rounded-xl bg-muted p-4 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Time until the event</dt>
          <dd data-testid="time-remaining">{timeRemaining}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">You paid</dt>
          <dd>{paidLabel}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Cancellation fee ({feePercent}%)</dt>
          <dd data-testid="fee-amount">{feeLabel}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 border-t pt-2">
          <dt>Your refund</dt>
          <dd className="font-display text-2xl" data-testid="refund-amount">
            {refundLabel}
          </dd>
        </div>
        <p className="pt-1">{explanation}</p>
        <p className="text-xs text-muted-foreground">Calculated {calculatedAt} (New York time) using the server clock. Refunds are simulated.</p>
      </dl>
      <label className="block text-sm">
        Reason (optional)
        <select name="reason" className="mt-1.5 h-10 w-full rounded-lg border border-input bg-card px-3">
          <option value="">Prefer not to say</option>
          <option>Plans changed</option>
          <option>Feeling unwell</option>
          <option>Booked the wrong date</option>
        </select>
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 size-4 accent-[var(--brand)]" />
        <span>
          I understand the fee is {feeLabel} and I&apos;ll be refunded {refundLabel}.
        </span>
      </label>
      {state && !state.ok && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="destructive" disabled={pending || !confirmed}>
          {pending ? "Cancelling…" : `Confirm cancellation · refund ${refundLabel}`}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Keep my booking
        </Button>
      </div>
    </form>
  );
}
