"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { cancelBookingAction, type CancelState } from "@/server/actions/bookings";

/** Two-step cancellation: show the exact refund first, then confirm. */
export function CancelPanel({
  bookingId,
  refundLabel,
  explanation,
  calculatedAt,
}: {
  bookingId: string;
  refundLabel: string;
  explanation: string;
  calculatedAt: string;
}) {
  const [open, setOpen] = useState(false);
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
      <div className="rounded-xl bg-muted p-4">
        <p className="text-sm text-muted-foreground">Your refund</p>
        <p className="font-display text-3xl" data-testid="refund-amount">
          {refundLabel}
        </p>
        <p className="mt-1 text-sm">{explanation}</p>
        <p className="mt-2 text-xs text-muted-foreground">Calculated {calculatedAt} (New York time) using the server clock. Refunds are simulated.</p>
      </div>
      <label className="block text-sm">
        Reason (optional)
        <select name="reason" className="mt-1.5 h-10 w-full rounded-lg border border-input bg-card px-3">
          <option value="">Prefer not to say</option>
          <option>Plans changed</option>
          <option>Feeling unwell</option>
          <option>Booked the wrong date</option>
        </select>
      </label>
      {state && !state.ok && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="destructive" disabled={pending}>
          {pending ? "Cancelling…" : `Confirm cancellation · refund ${refundLabel}`}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Keep my booking
        </Button>
      </div>
    </form>
  );
}
