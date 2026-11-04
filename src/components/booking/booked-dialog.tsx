"use client";

import { useEffect, useRef } from "react";
import { CalendarPlus, CircleCheck, Ticket } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * "You're booked!" confirmation shown once after checkout, with the late-cancellation terms the
 * guest just accepted and the exact fee for this booking.
 */
export function BookedDialog(p: {
  title: string;
  dateLabel: string;
  timeLabel: string;
  tickets: number;
  totalLabel: string;
  policyNotice: string | null;
  feeSentence: string | null;
  icsHref: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  const close = () => {
    ref.current?.close();
    document.getElementById("tickets-title")?.closest("section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby="booked-title"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border bg-card p-0 text-foreground shadow-lift backdrop:bg-black/40"
    >
      <div className="p-6 sm:p-7">
        <CircleCheck className="size-8 text-brand" aria-hidden />
        <h2 id="booked-title" className="mt-3 text-3xl">
          You&apos;re booked!
        </h2>
        <p className="mt-1 font-display text-xl">{p.title}</p>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Date</dt>
            <dd>{p.dateLabel}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Time</dt>
            <dd>{p.timeLabel}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Tickets</dt>
            <dd>{p.tickets}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Total (simulated)</dt>
            <dd>{p.totalLabel}</dd>
          </div>
        </dl>
        {p.policyNotice && (
          <div className="mt-5 rounded-xl border border-brand/40 bg-brand-soft/50 p-4 text-sm">
            <p className="font-medium text-accent-foreground">{p.policyNotice}</p>
            {p.feeSentence && <p className="mt-1">{p.feeSentence}</p>}
          </div>
        )}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button type="button" className="flex-1" onClick={close} autoFocus>
            <Ticket aria-hidden /> View My Ticket
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <a href={p.icsHref} download>
              <CalendarPlus aria-hidden /> Add to Calendar
            </a>
          </Button>
        </div>
      </div>
    </dialog>
  );
}
