"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Clock, Minus, Plus, Users } from "lucide-react";

import { spotsText } from "@/components/experiences/availability";
import { Button } from "@/components/ui/button";
import type { Availability } from "@/lib/booking/capacity";
import { clampPartySize, partySizeRange, seatsLabel, seatsTotalCents } from "@/lib/booking/party-size";
import { formatPrice } from "@/lib/format";
import { joinWaitlistAction } from "@/server/actions/waitlist";
import { cn } from "@/lib/utils";

export type PickerSession = {
  id: string;
  dateLabel: string;
  timeLabel: string;
  priceLabel: string;
  /** Price per seat for this date, in cents (0 = free). */
  unitPriceCents: number;
  seatsLeft: number;
  availability: Availability;
  waitlisted: boolean;
};

/**
 * Session selection, seat quantity (with a live total) + Reserve / Join waitlist. Sold-out sessions can never be booked here;
 * the server re-validates capacity on checkout anyway.
 */
export function SessionPicker({
  slug,
  sessions,
  initialId,
  path,
  bookLabel,
  seatNoun = "spot",
  minSeats = 1,
  fixedSeats,
  bookSuffix = "",
}: {
  slug: string;
  sessions: PickerSession[];
  initialId?: string;
  path: string;
  /** Optional overrides for events with their own reservation flow (e.g. Regina's Table, pairs only). */
  bookLabel?: string;
  seatNoun?: "spot" | "seat";
  minSeats?: number;
  /** Event rule: every booking is exactly this many seats (shown as a fixed quantity). */
  fixedSeats?: number;
  /** Appended to "Reserve N seats", e.g. " — Free". */
  bookSuffix?: string;
}) {
  const firstOpen = sessions.find((s) => s.availability === "AVAILABLE" || s.availability === "LIMITED");
  const [selected, setSelected] = useState(sessions.find((s) => s.id === initialId)?.id ?? firstOpen?.id ?? sessions[0]?.id);
  const [state, action, pending] = useActionState(joinWaitlistAction, null);
  const current = sessions.find((s) => s.id === selected);
  const range = partySizeRange(current?.seatsLeft ?? 0, { fixed: fixedSeats });
  const bookable =
    current && (current.availability === "AVAILABLE" || current.availability === "LIMITED") && current.seatsLeft >= minSeats && range.bookable;
  const [requested, setRequested] = useState(range.min);
  // Switching to a date with fewer seats left keeps the quantity within what that date allows.
  const seats = clampPartySize(requested, range);
  const total = current ? seatsTotalCents(current.unitPriceCents, seats) : 0;

  if (!sessions.length) return <p className="text-sm text-muted-foreground">No upcoming dates yet. Save it to hear when new dates are added.</p>;

  return (
    <div>
      <fieldset>
        <legend className="mb-3 text-sm font-medium">Choose a date</legend>
        <div className="space-y-2" role="radiogroup">
          {sessions.map((s) => {
            const disabled = s.availability === "CANCELLED" || s.availability === "PAST";
            const soldOut = s.availability === "SOLD_OUT";
            return (
              <label
                key={s.id}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 transition-[border-color,box-shadow] duration-200 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/30",
                  selected === s.id ? "border-foreground shadow-soft" : "hover:border-foreground/30",
                  disabled && "cursor-not-allowed opacity-50",
                )}
              >
                <input
                  type="radio"
                  name="session"
                  value={s.id}
                  checked={selected === s.id}
                  disabled={disabled}
                  onChange={() => setSelected(s.id)}
                  className="sr-only"
                />
                <span>
                  <span className="block text-sm font-medium">{s.dateLabel}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" aria-hidden /> {s.timeLabel}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block text-sm font-medium">{s.priceLabel}</span>
                  <span className={cn("text-xs", soldOut ? "text-foreground" : s.availability === "LIMITED" ? "text-brand" : "text-muted-foreground")}>
                    {s.availability === "CANCELLED" ? "Cancelled" : spotsText(s.seatsLeft, s.availability, seatNoun)}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-5">
        {bookable ? (
          <>
            <div className="mb-4 rounded-xl border bg-muted/40 p-4" data-testid="seat-quantity">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    <Users className="size-4" aria-hidden /> Guests
                  </p>
                  <p className="text-xs text-muted-foreground">{formatPrice(current.unitPriceCents)} per seat</p>
                </div>
                <div className="flex items-center gap-2" role="group" aria-label="Number of guests">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-9"
                    onClick={() => setRequested(seats - 1)}
                    disabled={range.fixed || seats <= range.min}
                    aria-label="Remove a guest"
                  >
                    <Minus aria-hidden />
                  </Button>
                  <output aria-live="polite" aria-label="Guests" className="w-8 text-center text-lg font-semibold tabular-nums" data-testid="seat-count">
                    {seats}
                  </output>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-9"
                    onClick={() => setRequested(seats + 1)}
                    disabled={range.fixed || seats >= range.max}
                    aria-label="Add a guest"
                  >
                    <Plus aria-hidden />
                  </Button>
                </div>
              </div>
              {range.fixed ? (
                <p className="mt-2 text-xs text-muted-foreground">This event takes reservations for exactly {fixedSeats} guests.</p>
              ) : (
                seats >= range.max &&
                range.max > 1 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {range.max < current.seatsLeft ? `Up to ${range.max} seats per booking.` : `Only ${seatsLabel(range.max)} left on this date.`}
                  </p>
                )
              )}
              <div className="mt-3 flex items-end justify-between gap-3 border-t pt-3">
                <span className="text-sm text-muted-foreground tabular-nums">
                  {formatPrice(current.unitPriceCents)} × {seatsLabel(seats)}
                </span>
                <span className="text-right">
                  <span className="mr-2 text-sm font-medium">Total</span>
                  <span className="font-display text-2xl tabular-nums" data-testid="card-total">
                    {formatPrice(total)}
                  </span>
                </span>
              </div>
            </div>
            <Button asChild variant="brand" size="lg" className="w-full">
              <Link href={`/experiences/${slug}/book?session=${current.id}&seats=${seats}`}>{bookLabel ?? `Reserve ${seatsLabel(seats)}${bookSuffix}`}</Link>
            </Button>
          </>
        ) : current?.availability === "SOLD_OUT" ? (
          current.waitlisted ? (
            <p className="rounded-xl bg-muted p-4 text-sm">
              You&apos;re on the waitlist for this date. See it in <Link className="text-brand underline" href="/bookings?view=waitlist">My Bookings</Link>.
            </p>
          ) : (
            <form action={action} className="space-y-3">
              <input type="hidden" name="sessionId" value={current.id} />
              <input type="hidden" name="path" value={path} />
              <label className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-1.5">
                  <Users className="size-4" aria-hidden /> Party size
                </span>
                <select name="partySize" defaultValue="2" className="h-10 rounded-lg border border-input bg-card px-3">
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? "guest" : "guests"}
                    </option>
                  ))}
                </select>
              </label>
              <Button type="submit" size="lg" className="w-full" disabled={pending}>
                {pending ? "Joining…" : "Sold out · Join the waitlist"}
              </Button>
              {state && <p role="status" className={cn("text-sm", state.ok ? "text-foreground" : "text-destructive")}>{state.message}</p>}
            </form>
          )
        ) : (
          <Button size="lg" className="w-full" disabled>
            Not available
          </Button>
        )}
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {bookable && current.unitPriceCents > 0 ? "A simulated service fee is added at checkout. " : ""}Demo checkout. No real payment is taken.
        </p>
      </div>
    </div>
  );
}
