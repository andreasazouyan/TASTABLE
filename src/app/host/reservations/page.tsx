import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Users } from "lucide-react";

import { StatusBadge } from "@/components/booking/status-badge";
import { CheckInForm, HostCancelBooking, SimulateScan } from "@/components/host/check-in";
import { inputClass } from "@/components/host/field";
import { PageHeader, SimulatedNote } from "@/components/host/stat-tile";
import { EmptyState } from "@/components/site/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireHost } from "@/lib/auth/demo";
import { formatDateTime, formatPrice } from "@/lib/format";
import { requestNow } from "@/lib/request-clock";
import { cn } from "@/lib/utils";
import { getHostEvents, getReservations, type ReservationSession } from "@/server/queries/host";

export const metadata: Metadata = { title: "Reservations" };

export default function ReservationsPage(props: PageProps<"/host/reservations">) {
  return (
    <div>
      <PageHeader title="Reservations" description="Who's coming, how many, and what they need. Guest details are visible only to you as the host." />
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <Reservations {...props} />
      </Suspense>
    </div>
  );
}

async function Reservations({ searchParams }: PageProps<"/host/reservations">) {
  const { host } = await requireHost("/host/reservations");
  const now = await requestNow();
  const sp = await searchParams;
  const view = sp.view === "past" ? "past" : "upcoming";
  const events = await getHostEvents(host.id, now);
  const eventId = typeof sp.event === "string" && events.some((e) => e.id === sp.event) ? sp.event : undefined;
  const sessions = await getReservations(host.id, now, view, eventId);

  const q = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const next = { view, event: eventId, ...patch };
    for (const [k, v] of Object.entries(next)) if (v && !(k === "view" && v === "upcoming")) p.set(k, v);
    const s = p.toString();
    return s ? `/host/reservations?${s}` : "/host/reservations";
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <div className="flex flex-wrap items-end gap-3">
          <nav aria-label="Time" className="flex gap-2">
            {(["upcoming", "past"] as const).map((v) => (
              <Link
                key={v}
                href={q({ view: v })}
                aria-current={view === v ? "page" : undefined}
                className={cn("rounded-full border px-4 py-1.5 text-sm", view === v ? "border-foreground bg-foreground text-background" : "hover:border-foreground/40")}
              >
                {v === "upcoming" ? "Upcoming" : "Past"}
              </Link>
            ))}
          </nav>
          <form action="/host/reservations" className="flex items-end gap-2">
            {view === "past" && <input type="hidden" name="view" value="past" />}
            <div>
              <label htmlFor="event" className="mb-1 block text-xs text-muted-foreground">
                Event
              </label>
              <select id="event" name="event" defaultValue={eventId ?? ""} className={cn(inputClass, "w-64")}>
                <option value="">All events</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" variant="outline" size="sm">
              Apply
            </Button>
          </form>
        </div>
        <CheckInForm />
      </div>

      {sessions.length ? (
        <div className="space-y-6">
          {sessions.map((s) => (
            <SessionBlock key={s.id} s={s} upcoming={view === "upcoming" && s.startsAt > now} />
          ))}
        </div>
      ) : (
        <EmptyState icon={Users} title={view === "upcoming" ? "No upcoming reservations" : "No past reservations"} description="Bookings for your events appear here as guests reserve." />
      )}
      <SimulatedNote>Guests and bookings on sample events are fictional. Check-in is a demo; no camera or real scanner is used.</SimulatedNote>
    </div>
  );
}

function SessionBlock({ s, upcoming }: { s: ReservationSession; upcoming: boolean }) {
  const active = s.bookings.filter((b) => b.status !== "CANCELLED");
  const guests = active.reduce((n, b) => n + b.ticketCount, 0);
  const checkedIn = active.flatMap((b) => b.tickets).filter((t) => t.status === "CHECKED_IN").length;
  const dietary = active.filter((b) => b.dietaryRequirements?.trim());
  const cancelled = s.bookings.length - active.length;

  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-soft" aria-labelledby={`s-${s.id}`}>
      <header className="flex flex-wrap items-baseline justify-between gap-3 border-b bg-muted/30 px-5 py-4">
        <div>
          <h2 id={`s-${s.id}`} className="font-display text-xl">
            {s.experience.title}
          </h2>
          <p className="text-sm text-muted-foreground">
            {formatDateTime(s.startsAt)}
            {s.status === "CANCELLED" && " · Date cancelled"}
          </p>
        </div>
        <dl className="flex gap-5 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Guests</dt>
            <dd className="font-medium tabular-nums">
              {guests}/{s.capacity}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Checked in</dt>
            <dd className="font-medium tabular-nums">{checkedIn}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Dietary notes</dt>
            <dd className="font-medium tabular-nums">{dietary.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Cancelled</dt>
            <dd className="font-medium tabular-nums">{cancelled}</dd>
          </div>
        </dl>
      </header>
      {/* relative: keeps sr-only (absolutely positioned) cells inside the scroll area on small screens */}
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[44rem] text-sm">
          <caption className="sr-only">Bookings for {s.experience.title}</caption>
          <thead className="text-left text-xs text-muted-foreground">
            <tr className="border-b">
              <th scope="col" className="px-5 py-2 font-medium">Guest</th>
              <th scope="col" className="px-3 py-2 font-medium">Party</th>
              <th scope="col" className="px-3 py-2 font-medium">Dietary needs</th>
              <th scope="col" className="px-3 py-2 font-medium">Status</th>
              <th scope="col" className="px-3 py-2 font-medium">Tickets</th>
              <th scope="col" className="px-5 py-2 font-medium"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {s.bookings.map((b) => (
              <tr key={b.id} className={cn("border-b align-top last:border-0", b.status === "CANCELLED" && "text-muted-foreground")}>
                <td className="px-5 py-3">
                  <p className="font-medium text-foreground">{b.contactName}</p>
                  <p className="font-mono text-xs text-muted-foreground">{b.reference}</p>
                </td>
                <td className="px-3 py-3 tabular-nums">
                  {b.ticketCount} · {formatPrice(b.subtotalCents)}
                </td>
                <td className="max-w-56 px-3 py-3">{b.dietaryRequirements?.trim() || <span className="text-muted-foreground">None</span>}</td>
                <td className="px-3 py-3">
                  <StatusBadge status={b.status} />
                  {b.status === "CANCELLED" && (
                    <p className="mt-1 text-xs">
                      {b.cancelledBy === "HOST" ? "By you" : "By guest"} · refunded {formatPrice(b.refundAmountCents)}
                    </p>
                  )}
                </td>
                <td className="px-3 py-3">
                  <ul className="space-y-1.5">
                    {b.tickets.map((t) => (
                      <li key={t.id} className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs">{t.code}</span>
                        <StatusBadge status={t.status} />
                        {upcoming && t.status === "VALID" && b.status === "CONFIRMED" && <SimulateScan code={t.code} label={t.attendeeName ?? b.contactName} />}
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="px-5 py-3 text-right">{upcoming && b.status === "CONFIRMED" && <HostCancelBooking bookingId={b.id} reference={b.reference} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
