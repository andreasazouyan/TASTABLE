import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, CalendarPlus, Sparkles } from "lucide-react";

import { StatusBadge } from "@/components/booking/status-badge";
import { RevenueChart } from "@/components/host/charts";
import { PageHeader, SimulatedNote, StatTile } from "@/components/host/stat-tile";
import { EmptyState } from "@/components/site/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { computeFinancials, occupancy, revenueSeries } from "@/lib/analytics/finance";
import { requireHost } from "@/lib/auth/demo";
import { formatDate, formatDateTime, formatPercent, formatPrice, formatTime } from "@/lib/format";
import { requestNow } from "@/lib/request-clock";
import { getFinanceData, getRecentReservations, getUpcomingSessions, resolveRange } from "@/server/queries/host";

export const metadata: Metadata = { title: "Overview" };

export default function HostOverviewPage(props: PageProps<"/host">) {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <Overview {...props} />
    </Suspense>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading overview">
      <Skeleton className="h-12 w-72" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );
}

async function Overview({ searchParams }: PageProps<"/host">) {
  const { host } = await requireHost("/host");
  const sp = await searchParams;
  const now = await requestNow();
  const range = resolveRange({ range: "30" }, now);
  const [data, upcoming, recent] = await Promise.all([
    getFinanceData(host.id, range.from, range.to, now),
    getUpcomingSessions(host.id, now),
    getRecentReservations(host.id),
  ]);
  const f = computeFinancials(data.bookings, data.financeExpenses);
  const occ = occupancy(data.sessions.filter((s) => s.startsAt <= now));
  const series = revenueSeries(data.bookings, range.from, range.to);
  const isNew = data.events.length === 0;

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow={host.isFictional ? "Fictional sample host" : "Your hosting"}
        title={`Hello, ${host.displayName.split(" ")[0]}`}
        description="Your last 30 days at a glance."
        actions={
          <Button asChild variant="brand">
            <Link href="/host/events/new">
              <CalendarPlus aria-hidden /> Create event
            </Link>
          </Button>
        }
      />

      {(sp.welcome === "1" || isNew) && (
        <section className="rounded-2xl border bg-brand-soft/60 p-6 sm:p-8" aria-labelledby="welcome-title">
          <Sparkles className="mb-3 size-5 text-brand" aria-hidden />
          <h2 id="welcome-title" className="text-2xl">
            Welcome to hosting on Tastable
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Create your first event: pick one of the four categories, add dates and a menu, then publish it to guest discovery. No venue yet? You can save a
            draft and send a venue assistance request. A request doesn&rsquo;t secure a venue.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild variant="default">
              <Link href="/host/events/new">Create your first event</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/host/venue-request">Request venue assistance</Link>
            </Button>
          </div>
        </section>
      )}

      <section aria-label="Key figures, last 30 days" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Gross ticket revenue" value={formatPrice(f.grossRevenueCents)} detail="Ticket subtotals of bookings made in the last 30 days" />
        <StatTile label="Tickets sold" value={f.ticketsSold.toLocaleString("en-US")} detail={`${f.bookings} bookings, ${f.cancellations} cancelled`} />
        <StatTile label="Upcoming dates" value={String(data.upcomingSessions)} detail="Scheduled sessions from now on" />
        <StatTile label="Occupancy" value={occ === null ? "—" : formatPercent(occ)} detail="Seats sold ÷ capacity, sessions held in the last 30 days" />
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-soft sm:p-6" aria-labelledby="rev-title">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="rev-title" className="text-xl">
            Net ticket revenue by booking date
          </h2>
          <Link href="/host/finances" className="inline-flex items-center gap-1 text-sm text-brand hover:underline">
            Full finances <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
        {f.bookings ? <RevenueChart data={series} /> : <p className="py-10 text-center text-sm text-muted-foreground">No bookings in the last 30 days yet.</p>}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="min-w-0 rounded-2xl border bg-card p-5 shadow-soft sm:p-6" aria-labelledby="up-title">
          <h2 id="up-title" className="mb-4 text-xl">
            Coming up
          </h2>
          {upcoming.length ? (
            <ul className="divide-y">
              {upcoming.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{s.experience.title}</p>
                    <p className="text-sm text-muted-foreground">{formatDateTime(s.startsAt)}</p>
                  </div>
                  <div className="shrink-0 text-right text-sm">
                    <p className="tabular-nums">
                      {s.seatsReserved}/{s.capacity} sold
                    </p>
                    {s._count.waitlist > 0 && <p className="text-xs text-muted-foreground">{s._count.waitlist} waiting</p>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No upcoming dates" description="Add dates to an event to start taking bookings." className="py-8" />
          )}
        </section>
        <section className="min-w-0 rounded-2xl border bg-card p-5 shadow-soft sm:p-6" aria-labelledby="recent-title">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 id="recent-title" className="text-xl">
              Latest reservations
            </h2>
            <Link href="/host/reservations" className="text-sm text-brand hover:underline">
              All reservations
            </Link>
          </div>
          {recent.length ? (
            <ul className="divide-y">
              {recent.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {b.contactName} · {b.ticketCount} {b.ticketCount === 1 ? "guest" : "guests"}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {b.session.experience.title} · {formatDate(b.session.startsAt)} {formatTime(b.session.startsAt)}
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No reservations yet" description="Bookings appear here as soon as guests reserve." className="py-8" />
          )}
        </section>
      </div>
      <SimulatedNote />
    </div>
  );
}
