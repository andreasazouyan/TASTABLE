"use client";

import { useActionState, useState } from "react";
import { CreditCard, Minus, Plus, ShieldCheck, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clampPartySize, partySizeRange } from "@/lib/booking/party-size";
import { MAX_TICKETS_PER_BOOKING, quote } from "@/lib/booking/pricing";
import { formatMoney } from "@/lib/format";
import { CHECKOUT_POLICY_NOTICE, LATE_FEE_PERCENT, lateFeeCents } from "@/lib/booking/cancellation";
import { cn } from "@/lib/utils";
import { checkoutAction, type CheckoutState } from "@/server/actions/bookings";

type Props = {
  sessionId: string;
  unitPriceCents: number;
  seatsLeft: number;
  /** Quantity picked on the event page (raw URL value; clamped here). */
  initialSeats?: string;
  policyName: string;
  policyLines: string[];
  defaultName: string;
  defaultEmail: string;
  dietaryOptions: string[];
};

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="mt-1.5 text-sm text-destructive">{messages[0]}</p>;
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-soft sm:p-6" aria-labelledby={`step-${n}`}>
      <h2 id={`step-${n}`} className="mb-4 flex items-center gap-3 text-xl">
        <span className="grid size-7 place-items-center rounded-full bg-foreground font-sans text-xs text-background">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * Demo checkout: tickets (+1), guest details, dietary needs, policy acknowledgement and a
 * clearly simulated payment. No card fields exist anywhere in this form.
 */
export function CheckoutForm(p: Props) {
  const max = Math.min(MAX_TICKETS_PER_BOOKING, p.seatsLeft);
  const [tickets, setTickets] = useState(() => Math.min(max, clampPartySize(p.initialSeats, partySizeRange(p.seatsLeft))));
  const [state, action, pending] = useActionState<CheckoutState, FormData>(checkoutAction, null);
  // Controlled so a guest's ticks survive a server-side validation error (React resets uncontrolled forms).
  const [ackPolicy, setAckPolicy] = useState(false);
  const [ackSimulated, setAckSimulated] = useState(false);
  const price = quote(p.unitPriceCents, Math.max(1, tickets));
  const fe = state?.fieldErrors ?? {};

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start" noValidate>
      <input type="hidden" name="sessionId" value={p.sessionId} />
      <input type="hidden" name="ticketCount" value={tickets} />

      <div className="space-y-6">
        <Step n={1} title="Tickets">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-medium">General admission</p>
              <p className="text-sm text-muted-foreground">
                {formatMoney(p.unitPriceCents)} per seat · {p.seatsLeft} {p.seatsLeft === 1 ? "seat" : "seats"} left
              </p>
            </div>
            <div className="flex items-center gap-2" role="group" aria-label="Ticket quantity">
              <Button type="button" variant="outline" size="icon" onClick={() => setTickets((t) => Math.max(1, t - 1))} disabled={tickets <= 1} aria-label="Remove a ticket">
                <Minus aria-hidden />
              </Button>
              <output aria-live="polite" className="w-10 text-center text-lg font-semibold tabular-nums">
                {tickets}
              </output>
              <Button type="button" variant="outline" size="icon" onClick={() => setTickets((t) => Math.min(max, t + 1))} disabled={tickets >= max} aria-label="Add a ticket">
                <Plus aria-hidden />
              </Button>
            </div>
          </div>
          {tickets === 1 && max >= 2 && (
            <button
              type="button"
              onClick={() => setTickets(2)}
              className="mt-4 flex w-full items-center gap-3 rounded-xl border border-dashed border-brand/50 bg-brand-soft/50 px-4 py-3 text-left transition-colors hover:bg-brand-soft"
            >
              <UserPlus className="size-5 text-brand" aria-hidden />
              <span>
                <span className="block font-medium text-accent-foreground">+1 · Bring someone</span>
                <span className="text-sm text-muted-foreground">Add a ticket for a friend or partner. You&apos;ll sit together.</span>
              </span>
            </button>
          )}
          {max < 2 && <p className="mt-3 text-sm text-muted-foreground">Only one seat is left on this date.</p>}
          <FieldError messages={fe.ticketCount} />
        </Step>

        <Step n={2} title="Guest details">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="contactName">Lead guest name</Label>
              <Input id="contactName" name="contactName" defaultValue={p.defaultName} autoComplete="name" className="mt-1.5" aria-invalid={!!fe.contactName} required />
              <FieldError messages={fe.contactName} />
            </div>
            <div>
              <Label htmlFor="contactEmail">Email for your tickets</Label>
              <Input id="contactEmail" name="contactEmail" type="email" defaultValue={p.defaultEmail} autoComplete="email" className="mt-1.5" aria-invalid={!!fe.contactEmail} required />
              <FieldError messages={fe.contactEmail} />
            </div>
          </div>
          {Array.from({ length: tickets - 1 }, (_, i) => (
            <div key={i} className="mt-4 grid gap-4 rounded-xl bg-muted/60 p-4 sm:grid-cols-2">
              <div>
                <Label htmlFor={`attendee-${i}`}>Guest {i + 2} name (optional)</Label>
                <Input id={`attendee-${i}`} name="attendeeName" className="mt-1.5" placeholder="Shown on their ticket" />
              </div>
              <div>
                <Label htmlFor={`attendee-diet-${i}`}>Guest {i + 2} dietary needs</Label>
                <Input id={`attendee-diet-${i}`} name="attendeeDietary" className="mt-1.5" placeholder="e.g. vegetarian" />
              </div>
            </div>
          ))}
          <div className="mt-4">
            <Label htmlFor="dietaryRequirements">Dietary requirements or allergies</Label>
            <textarea
              id="dietaryRequirements"
              name="dietaryRequirements"
              rows={3}
              className="mt-1.5 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
              placeholder={p.dietaryOptions.length ? `The host can accommodate: ${p.dietaryOptions.join(", ")}` : "Let the host know"}
            />
          </div>
        </Step>

        <Step n={3} title="Cancellation policy">
          <p className="font-medium">{p.policyName}</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {p.policyLines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          <div className="mt-4 rounded-xl border border-brand/40 bg-brand-soft/50 p-4 text-sm" data-testid="late-fee-notice">
            <p className="font-medium text-accent-foreground">{CHECKOUT_POLICY_NOTICE}</p>
            <p className="mt-1 text-muted-foreground">
              For this booking, a late cancellation fee would be {formatMoney(lateFeeCents(price.subtotalCents))} ({LATE_FEE_PERCENT}% of the {formatMoney(price.subtotalCents)} ticket
              subtotal). It&apos;s kept from what you paid and the rest is refunded, never charged on top.
            </p>
          </div>
          <label className="mt-4 flex items-start gap-3 text-sm">
            <input type="checkbox" name="acknowledgePolicy" checked={ackPolicy} onChange={(e) => setAckPolicy(e.target.checked)} className="mt-0.5 size-4 accent-[var(--brand)]" required aria-invalid={!!fe.acknowledgePolicy} />
            <span>I&apos;ve read the cancellation policy and accept the {LATE_FEE_PERCENT}% fee for cancellations made less than 24 hours before the event.</span>
          </label>
          <FieldError messages={fe.acknowledgePolicy} />
        </Step>

        <Step n={4} title="Payment (simulated)">
          <div className="flex items-start gap-3 rounded-xl border border-dashed bg-muted/50 p-4">
            <CreditCard className="mt-0.5 size-5 text-brand" aria-hidden />
            <div className="text-sm">
              <p className="font-medium">Demo payment · nothing will be charged</p>
              <p className="mt-1 text-muted-foreground">
                Tastable is a prototype. We never ask for card numbers. Confirming creates a simulated transaction so you can try the full flow.
              </p>
            </div>
          </div>
          <label className="mt-4 flex items-start gap-3 text-sm">
            <input type="checkbox" name="acknowledgeSimulated" checked={ackSimulated} onChange={(e) => setAckSimulated(e.target.checked)} className="mt-0.5 size-4 accent-[var(--brand)]" required aria-invalid={!!fe.acknowledgeSimulated} />
            <span>I understand this is a simulated payment for a fictional sample event.</span>
          </label>
          <FieldError messages={fe.acknowledgeSimulated} />
        </Step>
      </div>

      <aside className="rounded-2xl border bg-card p-5 shadow-lift lg:sticky lg:top-24 sm:p-6" aria-label="Order summary">
        <h2 className="mb-4 text-xl">Summary</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt>
              {tickets} × {formatMoney(p.unitPriceCents)}
            </dt>
            <dd className="tabular-nums">{formatMoney(price.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <dt>Service fee (6%, simulated)</dt>
            <dd className="tabular-nums">{formatMoney(price.serviceFeeCents)}</dd>
          </div>
          <div className="flex justify-between border-t pt-3 text-base font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums" data-testid="checkout-total">
              {formatMoney(price.totalCents)}
            </dd>
          </div>
        </dl>
        {state?.error && (
          <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {state.error}
          </p>
        )}
        <Button type="submit" variant="brand" size="lg" className={cn("mt-5 w-full")} disabled={pending || max < 1}>
          {pending ? "Confirming…" : `Confirm demo booking · ${formatMoney(price.totalCents)}`}
        </Button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5" aria-hidden /> Seats are re-checked on the server before confirming.
        </p>
      </aside>
    </form>
  );
}
