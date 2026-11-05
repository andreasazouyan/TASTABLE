"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Gift, ShieldCheck, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { REGINA_BOOK_LABEL, REGINA_MAINS, REGINA_PARTY_SIZE, REGINA_PRICE_NOTE } from "@/lib/domain/reginas-table";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { reserveReginasTableAction, type ReginaReserveState } from "@/server/actions/reginas-table";

type Props = {
  sessionId: string;
  seatsLeft: number;
  dateLabel: string;
  timeLabel: string;
  venueName: string;
  venueAddress: string;
  defaultName: string;
  defaultEmail: string;
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

function MainChoice({ name, legend, value, onChange, error }: { name: string; legend: string; value: string; onChange: (v: string) => void; error?: string[] }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
        {REGINA_MAINS.map((m) => (
          <label
            key={m.key}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm transition-[border-color,box-shadow] duration-200 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/30",
              value === m.key ? "border-foreground shadow-soft" : "hover:border-foreground/30",
            )}
          >
            <input type="radio" name={name} value={m.key} checked={value === m.key} onChange={() => onChange(m.key)} className="size-4 accent-[var(--brand)]" required />
            {m.label}
          </label>
        ))}
      </div>
      <FieldError messages={error} />
    </fieldset>
  );
}

/**
 * Regina's Table reservation: exactly two guests (you and a +1), a main course for each, and a
 * $0 total. No payment step: the event is complimentary.
 */
export function ReginaReservationForm(p: Props) {
  const [state, action, pending] = useActionState<ReginaReserveState, FormData>(reserveReginasTableAction, null);
  // Controlled so choices survive a server-side validation error (React resets uncontrolled forms).
  const [name, setName] = useState(p.defaultName);
  const [plusOne, setPlusOne] = useState("");
  const [mainGuest, setMainGuest] = useState("");
  const [mainPlusOne, setMainPlusOne] = useState("");
  const fe = state?.fieldErrors ?? {};
  const label = (k: string) => REGINA_MAINS.find((m) => m.key === k)?.label ?? "Not chosen yet";
  const enough = p.seatsLeft >= REGINA_PARTY_SIZE;

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start" noValidate>
      <input type="hidden" name="sessionId" value={p.sessionId} />

      <div className="space-y-6">
        <Step n={1} title="Your party">
          <p className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="size-4 text-brand" aria-hidden /> Every reservation is for 2 guests: you and a +1. {p.seatsLeft} seats left.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="contactName">Your name</Label>
              <Input id="contactName" name="contactName" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="mt-1.5" aria-invalid={!!fe.contactName} required />
              <FieldError messages={fe.contactName} />
            </div>
            <div>
              <Label htmlFor="contactEmail">Email</Label>
              <Input id="contactEmail" name="contactEmail" type="email" defaultValue={p.defaultEmail} autoComplete="email" className="mt-1.5" aria-invalid={!!fe.contactEmail} required />
              <FieldError messages={fe.contactEmail} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="plusOneName">Your +1&apos;s name (optional)</Label>
              <Input id="plusOneName" name="plusOneName" value={plusOne} onChange={(e) => setPlusOne(e.target.value)} className="mt-1.5" placeholder="Shown on their ticket" />
            </div>
          </div>
        </Step>

        <Step n={2} title="Choose your mains">
          <p className="mb-4 text-sm text-muted-foreground">Everyone starts with a fresh green salad and finishes with chocolate cake.</p>
          <div className="space-y-5">
            <MainChoice name="mainGuest" legend={`Main for ${name.trim() || "you"}`} value={mainGuest} onChange={setMainGuest} error={fe.mainGuest} />
            <MainChoice name="mainPlusOne" legend={`Main for ${plusOne.trim() || "your +1"}`} value={mainPlusOne} onChange={setMainPlusOne} error={fe.mainPlusOne} />
          </div>
          <div className="mt-5">
            <Label htmlFor="dietaryRequirements">Allergies or anything Regina should know (optional)</Label>
            <textarea
              id="dietaryRequirements"
              name="dietaryRequirements"
              rows={2}
              className="mt-1.5 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
            />
          </div>
        </Step>
      </div>

      <aside className="rounded-2xl border bg-card p-5 shadow-lift lg:sticky lg:top-24 sm:p-6" aria-label="Reservation summary">
        <h2 className="mb-4 text-xl">Summary</h2>
        <dl className="space-y-2.5 text-sm" data-testid="regina-summary">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Date</dt>
            <dd className="text-right">{p.dateLabel}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Time</dt>
            <dd className="text-right">{p.timeLabel}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Venue</dt>
            <dd className="text-right">
              {p.venueName}
              <span className="block text-xs text-muted-foreground">{p.venueAddress}</span>
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Guests</dt>
            <dd className="text-right">2 (you + 1)</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{name.trim() || "You"}</dt>
            <dd className={cn("text-right", !mainGuest && "text-muted-foreground")}>{label(mainGuest)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{plusOne.trim() || "Your +1"}</dt>
            <dd className={cn("text-right", !mainPlusOne && "text-muted-foreground")}>{label(mainPlusOne)}</dd>
          </div>
          <div className="flex justify-between border-t pt-3 text-base font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums" data-testid="checkout-total">
              {formatMoney(0)}
            </dd>
          </div>
        </dl>
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-brand/40 bg-brand-soft/50 p-3 text-sm font-medium text-accent-foreground">
          <Gift className="mt-0.5 size-4 shrink-0" aria-hidden /> {REGINA_PRICE_NOTE}
        </p>
        {state?.error && (
          <div role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {state.error}
            {state.existingReference && (
              <Link href={`/bookings/${state.existingReference}`} className="mt-1 block font-medium underline">
                See your reservation
              </Link>
            )}
          </div>
        )}
        <Button type="submit" variant="brand" size="lg" className="mt-5 w-full" disabled={pending || !enough} aria-disabled={pending || !enough}>
          {pending ? "Reserving…" : enough ? REGINA_BOOK_LABEL : "Sold out"}
        </Button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 shrink-0" aria-hidden /> Demo reservation. No payment, no invitations sent.
        </p>
      </aside>
    </form>
  );
}
