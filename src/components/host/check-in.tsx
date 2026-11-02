"use client";

import { useActionState } from "react";
import { QrCode, ScanLine, XCircle } from "lucide-react";

import { inputClass } from "@/components/host/field";
import { Button } from "@/components/ui/button";
import { checkInAction, hostCancelBookingAction, type FormState } from "@/server/actions/host";

/** Demo check-in: type or paste a ticket code (what a QR scan would read). */
export function CheckInForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(checkInAction, null);
  return (
    <form action={action} className="rounded-2xl border bg-card p-5 shadow-soft">
      <label htmlFor="code" className="mb-1 flex items-center gap-2 font-medium">
        <QrCode className="size-4 text-brand" aria-hidden /> Check in a guest
      </label>
      <p className="mb-3 text-sm text-muted-foreground">Demo scanner: enter the code printed under the guest&rsquo;s QR ticket. No camera access is used.</p>
      <div className="flex gap-2">
        <input id="code" name="code" className={`${inputClass} font-mono uppercase`} placeholder="TKT-XXXX-XXXX-XX" autoComplete="off" />
        <Button type="submit" disabled={pending}>
          <ScanLine aria-hidden /> Check in
        </Button>
      </div>
      {state && (
        <p role="status" className={state.ok ? "mt-3 text-sm text-[#3f5130]" : "mt-3 text-sm text-destructive"}>
          {state.message}
        </p>
      )}
    </form>
  );
}

export function SimulateScan({ code, label }: { code: string; label: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(checkInAction, null);
  return (
    <form action={action} className="inline-flex items-center gap-2">
      <input type="hidden" name="code" value={code} />
      <Button type="submit" size="sm" variant="outline" disabled={pending} aria-label={`Simulate scan for ${label}`}>
        <ScanLine aria-hidden /> Simulate scan
      </Button>
      {state && !state.ok && <span className="text-xs text-destructive">{state.message}</span>}
    </form>
  );
}

export function HostCancelBooking({ bookingId, reference }: { bookingId: string; reference: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(hostCancelBookingAction, null);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`Cancel booking ${reference}? The guest is fully refunded (simulated).`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="bookingId" value={bookingId} />
      <Button type="submit" size="sm" variant="ghost" disabled={pending}>
        <XCircle aria-hidden /> Cancel booking
      </Button>
      {state && <span role="status" className="ml-2 text-xs text-muted-foreground">{state.message}</span>}
    </form>
  );
}
