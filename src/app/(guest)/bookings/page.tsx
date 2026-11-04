import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarPlus, Star, Ticket } from "lucide-react";

import { StatusBadge } from "@/components/booking/status-badge";
import { EmptyState } from "@/components/site/empty-state";
import { Photo } from "@/components/site/photo";
import { Button } from "@/components/ui/button";
import { ReminderBanners } from "@/components/booking/reminder-banners";
import { Skeleton } from "@/components/ui/skeleton";
import { requireGuest } from "@/lib/auth/demo";
import { formatDate, formatMoney, formatTime } from "@/lib/format";
import { requestNow } from "@/lib/request-clock";
import { ELIGIBILITY_MESSAGES, reviewEligibility } from "@/lib/reviews";
import { cn } from "@/lib/utils";
import { leaveWaitlistAction } from "@/server/actions/waitlist";
import { getGuestBookings, getWaitlist, splitBookings, waitlistPosition, type BookingView, type GuestBooking } from "@/server/queries/bookings";

export const metadata: Metadata = { title: "My Bookings" };

const TABS: { key: BookingView; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "cancelled", label: "Cancelled" },
  { key: "waitlist", label: "Waitlist" },
];

export default function BookingsPage(props: PageProps<"/bookings">) {
  return (
    <div className="container-page pt-8 sm:pt-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Your tickets</p>
          <h1 className="text-4xl sm:text-5xl">My Bookings</h1>
        </div>
        <Button asChild variant="outline">
          <a href="/api/calendar/me.ics" download>
            <CalendarPlus aria-hidden /> Export all to calendar (.ics)
          </a>
        </Button>
      </header>
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <Bookings {...props} />
      </Suspense>
    </div>
  );
}

function BookingRow({ b, now }: { b: GuestBooking; now: Date }) {
  const e = b.session.experience;
  const ended = b.status !== "CANCELLED" && b.session.endsAt <= now;
  const eligibility = reviewEligibility(b, now);
  return (
    <li className="min-w-0">
      <Link
        href={`/bookings/${b.reference}`}
        className="flex gap-4 rounded-2xl border bg-card p-3 shadow-soft transition-[border-color,box-shadow] hover:border-foreground/25 hover:shadow-lift focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none sm:p-4"
      >
        <Photo src={e.photos[0]?.url} alt="" theme="terracotta" sizes="128px" className="aspect-square w-20 shrink-0 rounded-xl sm:w-28" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={b.status} />
            <span className="font-mono text-xs text-muted-foreground">{b.reference}</span>
          </div>
          <h2 className="mt-1.5 truncate font-display text-lg sm:text-xl">{e.title}</h2>
          <p className="text-sm text-muted-foreground">
            {formatDate(b.session.startsAt, { weekday: "short", month: "short", day: "numeric", year: "numeric" })} · {formatTime(b.session.startsAt)} ·{" "}
            {e.venue.neighborhood}
          </p>
          <p className="mt-1 text-sm">
            {b.ticketCount} {b.ticketCount === 1 ? "ticket" : "tickets"} · {formatMoney(b.totalPriceCents)}
            {b.status === "CANCELLED" && <span className="text-muted-foreground"> · refunded {formatMoney(b.refundAmountCents)}</span>}
          </p>
        </div>
      </Link>
      {ended && (
        <div className="mt-2 flex flex-wrap items-center gap-2 px-1 text-sm">
          {b.review ? (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/bookings/${b.reference}/review`}>
                <Star aria-hidden /> Edit your review
              </Link>
            </Button>
          ) : eligibility.eligible ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/bookings/${b.reference}/review`}>
                <Star aria-hidden /> Leave a Review
              </Link>
            </Button>
          ) : (
            <span className="text-muted-foreground">{ELIGIBILITY_MESSAGES[eligibility.reason]}</span>
          )}
        </div>
      )}
    </li>
  );
}

async function Bookings({ searchParams }: PageProps<"/bookings">) {
  const sp = await searchParams;
  const view = (TABS.find((t) => t.key === sp.view)?.key ?? "upcoming") as BookingView;
  const { guest } = await requireGuest("/bookings");
  const now = await requestNow();
  const [all, waitlist] = await Promise.all([getGuestBookings(guest.id), getWaitlist(guest.id)]);
  const groups = splitBookings(all, now);
  const positions = await Promise.all(waitlist.map((w) => waitlistPosition(w.sessionId, w.createdAt)));
  const counts = { upcoming: groups.upcoming.length, past: groups.past.length, cancelled: groups.cancelled.length, waitlist: waitlist.length, invitations: 0 };

  return (
    <>
      <ReminderBanners guestId={guest.id} now={now} />
      <nav aria-label="Booking views" className="mb-6 flex gap-1 overflow-x-auto rounded-full bg-muted p-1 sm:inline-flex">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "upcoming" ? "/bookings" : `/bookings?view=${t.key}`}
            aria-current={view === t.key ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm transition-colors",
              view === t.key ? "bg-card font-medium shadow-soft" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label} <span className="text-muted-foreground tabular-nums">{counts[t.key]}</span>
          </Link>
        ))}
      </nav>

      {view === "waitlist" ? (
        waitlist.length ? (
          <ul className="grid gap-3 lg:grid-cols-2">
            {waitlist.map((w, i) => (
              <li key={w.id} className="flex items-center justify-between gap-4 rounded-2xl border bg-card p-4 shadow-soft">
                <div className="min-w-0">
                  <StatusBadge status={w.status} />
                  <h2 className="mt-1.5 truncate font-display text-lg">
                    <Link href={`/experiences/${w.session.experience.slug}?session=${w.sessionId}`} className="hover:underline">
                      {w.session.experience.title}
                    </Link>
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(w.session.startsAt)} · {formatTime(w.session.startsAt)} · party of {w.partySize}
                    {w.status === "WAITING" && ` · #${positions[i]} in line`}
                  </p>
                  {w.status === "NOTIFIED" && <p className="mt-1 text-sm text-brand">Seats opened up. Book soon: they&apos;re first come, first served.</p>}
                </div>
                <form action={leaveWaitlistAction}>
                  <input type="hidden" name="entryId" value={w.id} />
                  <Button type="submit" variant="ghost" size="sm">
                    Leave
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={Ticket} title="You're not on any waitlists" description="When a date is sold out you can join its waitlist from the experience page." />
        )
      ) : groups[view as "upcoming" | "past" | "cancelled"].length ? (
        <ul className="grid gap-3 lg:grid-cols-2">
          {groups[view as "upcoming" | "past" | "cancelled"].map((b) => (
            <BookingRow key={b.id} b={b} now={now} />
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={Ticket}
          title={view === "upcoming" ? "No upcoming bookings" : view === "past" ? "No past experiences yet" : "No cancelled bookings"}
          description={view === "upcoming" ? "Find something worth sharing and your tickets will appear here." : undefined}
        >
          {view === "upcoming" && (
            <Button asChild>
              <Link href="/discover">Discover experiences</Link>
            </Button>
          )}
        </EmptyState>
      )}
    </>
  );
}
