"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Clock, Users } from "lucide-react";

import { spotsText } from "@/components/experiences/availability";
import { Button } from "@/components/ui/button";
import type { Availability } from "@/lib/booking/capacity";
import { joinWaitlistAction } from "@/server/actions/waitlist";
import { cn } from "@/lib/utils";

export type PickerSession = {
  id: string;
  dateLabel: string;
  timeLabel: string;
  priceLabel: string;
  seatsLeft: number;
  availability: Availability;
  waitlisted: boolean;
};

/**
 * Session selection + Book / Join waitlist. Sold-out sessions can never be booked here;
 * the server re-validates capacity on checkout anyway.
 */
export function SessionPicker({
  slug,
  sessions,
  initialId,
  path,
  bookLabel = "Book now",
  seatNoun = "spot",
  minSeats = 1,
}: {
  slug: string;
  sessions: PickerSession[];
  initialId?: string;
  path: string;
  /** Optional overrides for events with their own reservation flow (e.g. Regina's Table, pairs only). */
  bookLabel?: string;
  seatNoun?: "spot" | "seat";
  minSeats?: number;
}) {
  const firstOpen = sessions.find((s) => s.availability === "AVAILABLE" || s.availability === "LIMITED");
  const [selected, setSelected] = useState(sessions.find((s) => s.id === initialId)?.id ?? firstOpen?.id ?? sessions[0]?.id);
  const [state, action, pending] = useActionState(joinWaitlistAction, null);
  const current = sessions.find((s) => s.id === selected);
  const bookable = current && (current.availability === "AVAILABLE" || current.availability === "LIMITED") && current.seatsLeft >= minSeats;

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
          <Button asChild variant="brand" size="lg" className="w-full">
            <Link href={`/experiences/${slug}/book?session=${current.id}`}>{bookLabel}</Link>
          </Button>
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
        <p className="mt-3 text-center text-xs text-muted-foreground">Demo checkout. No real payment is taken.</p>
      </div>
    </div>
  );
}
