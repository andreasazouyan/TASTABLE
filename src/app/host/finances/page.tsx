import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Trash2 } from "lucide-react";

import { BookingTrendChart, HorizontalBars, RevenueChart } from "@/components/host/charts";
import { EXPENSE_CATEGORIES, ExpenseEditToggle, ExpenseForm } from "@/components/host/expense-form";
import { inputClass } from "@/components/host/field";
import { PerformanceTable } from "@/components/host/performance-table";
import { PageHeader, SimulatedNote, StatTile } from "@/components/host/stat-tile";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { computeFinancials, occupancy, revenueSeries, sessionPerformance } from "@/lib/analytics/finance";
import { requireHost } from "@/lib/auth/demo";
import { PLATFORM_FEE_RATE } from "@/lib/booking/pricing";
import { formatDate, formatDateTime, formatMoney, formatPercent, formatPrice, isoDateNY } from "@/lib/format";
import { requestNow } from "@/lib/request-clock";
import { cn } from "@/lib/utils";
import { deleteExpenseAction } from "@/server/actions/host";
import { getFinanceData, resolveRange } from "@/server/queries/host";

export const metadata: Metadata = { title: "Finances" };

export default function FinancesPage(props: PageProps<"/host/finances">) {
  return (
    <div>
      <PageHeader title="Finances" description="Revenue, costs and estimated profit for your events, computed live from bookings and the expenses you record." />
      <Suspense
        fallback={
          <div className="space-y-6" aria-busy="true" aria-label="Loading finances">
            <Skeleton className="h-12 w-full max-w-xl" />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
            <Skeleton className="h-80 rounded-2xl" />
          </div>
        }
      >
        <Finances {...props} />
      </Suspense>
    </div>
  );
}

const RANGES = [
  { key: "7", label: "7 days" },
  { key: "30", label: "30 days" },
  { key: "90", label: "90 days" },
] as const;

async function Finances({ searchParams }: PageProps<"/host/finances">) {
  const { host } = await requireHost("/host/finances");
  const now = await requestNow();
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const range = resolveRange({ range: str("range"), from: str("from"), to: str("to") }, now);
  const data = await getFinanceData(host.id, range.from, range.to, now);

  const f = computeFinancials(data.bookings, data.financeExpenses);
  const heldSessions = data.sessions.filter((s) => s.startsAt <= now);
  const occ = occupancy(heldSessions);
  const series = revenueSeries(data.bookings, range.from, range.to);
  const perf = sessionPerformance(data.sessions, data.sessionBookings, data.sessionExpenses);

  // Event performance chart: occupancy per event across its dates in range.
  const byEvent = new Map<string, { label: string; cap: number; sold: number }>();
  for (const p of perf) {
    if (p.status === "CANCELLED") continue;
    const g = byEvent.get(p.experienceId) ?? { label: p.event, cap: 0, sold: 0 };
    g.cap += p.capacity;
    g.sold += Math.round(p.occupancy * p.capacity);
    byEvent.set(p.experienceId, g);
  }
  const eventOcc = Array.from(byEvent.values())
    .map((g) => ({ label: g.label.length > 28 ? `${g.label.slice(0, 27)}…` : g.label, fullLabel: g.label, occupancy: g.cap ? g.sold / g.cap : 0 }))
    .sort((a, b) => b.occupancy - a.occupancy);

  const events = data.events.map((e) => ({ id: e.id, title: e.title, sessions: e.sessions.map((s) => ({ id: s.id, label: formatDateTime(s.startsAt) })) }));
  const rangeLabel = `${formatDate(range.from, { month: "short", day: "numeric", year: "numeric" })} – ${formatDate(new Date(range.to.getTime() - 1), { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end gap-4">
        <nav aria-label="Date range" className="flex gap-2">
          {RANGES.map((r) => (
            <Link
              key={r.key}
              href={`/host/finances?range=${r.key}`}
              aria-current={range.key === r.key ? "page" : undefined}
              className={cn("rounded-full border px-4 py-1.5 text-sm", range.key === r.key ? "border-foreground bg-foreground text-background" : "hover:border-foreground/40")}
            >
              {r.label}
            </Link>
          ))}
        </nav>
        <form action="/host/finances" className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="range" value="custom" />
          <div>
            <label htmlFor="from" className="mb-1 block text-xs text-muted-foreground">
              From
            </label>
            <input id="from" name="from" type="date" defaultValue={range.fromIso} className={cn(inputClass, "w-40")} />
          </div>
          <div>
            <label htmlFor="to" className="mb-1 block text-xs text-muted-foreground">
              To
            </label>
            <input id="to" name="to" type="date" defaultValue={range.toIso} className={cn(inputClass, "w-40")} />
          </div>
          <Button type="submit" variant={range.key === "custom" ? "default" : "outline"} size="sm">
            Custom range
          </Button>
        </form>
        <p className="w-full text-sm text-muted-foreground">
          {rangeLabel}. Revenue counts bookings by the date they were made; occupancy and the event table use event dates.
        </p>
      </div>

      <section aria-label="Key figures" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Gross ticket revenue" value={formatPrice(f.grossRevenueCents)} detail="Ticket subtotals before refunds. Guest service fees are not yours." />
        <StatTile label="Tickets sold" value={f.ticketsSold.toLocaleString("en-US")} detail={`Across ${f.bookings - f.cancellations} active bookings`} />
        <StatTile label="Upcoming dates" value={String(data.upcomingSessions)} detail="Scheduled sessions from now on (all time)" />
        <StatTile label="Occupancy" value={occ === null ? "—" : formatPercent(occ)} detail={`Seats sold ÷ capacity across ${heldSessions.length} dates held in range`} />
        <StatTile label="Average ticket price" value={f.averageTicketPriceCents === null ? "—" : formatPrice(f.averageTicketPriceCents)} detail="Gross revenue ÷ tickets booked" />
        <StatTile label="Cancellation rate" value={f.cancellationRate === null ? "—" : formatPercent(f.cancellationRate, 1)} detail={`${f.cancellations} of ${f.bookings} bookings cancelled`} />
        <StatTile label="Estimated net revenue" value={formatPrice(f.estimatedNetRevenueCents)} detail={`Gross − refunds − ${Math.round(PLATFORM_FEE_RATE * 100)}% platform fee`} emphasis />
        <StatTile
          label="Estimated profit"
          value={formatPrice(f.estimatedProfitCents)}
          detail={f.profitMargin === null ? "No revenue in this period" : `${formatPercent(f.profitMargin, 1)} margin on gross, after your expenses`}
          emphasis
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_22rem]" aria-labelledby="profit-title">
        <div className="min-w-0 rounded-2xl border bg-card p-5 shadow-soft sm:p-6">
          <h2 id="profit-title" className="mb-4 text-xl">
            How estimated profit is calculated
          </h2>
          <table className="w-full text-sm">
            <caption className="sr-only">Profit breakdown</caption>
            <tbody className="tabular-nums">
              <Row label="Gross ticket revenue" value={f.grossRevenueCents} />
              <Row label="Refunds to guests" value={-f.refundsCents} />
              <Row label={`Platform fees (${Math.round(PLATFORM_FEE_RATE * 100)}% of net tickets)`} value={-f.platformFeesCents} />
              <Row label="Estimated net revenue (simulated payout)" value={f.estimatedNetRevenueCents} strong />
              <Row label="Your recorded expenses" value={-f.expensesCents} />
              <Row label="Estimated profit" value={f.estimatedProfitCents} strong />
            </tbody>
          </table>
        </div>
        <div className="rounded-2xl border border-dashed bg-muted/40 p-5 text-sm leading-relaxed text-muted-foreground">
          <p className="mb-2 font-medium text-foreground">Profit is not a payout</p>
          <p>
            <strong className="text-foreground">Estimated net revenue</strong> is what a payout would be: ticket revenue after refunds and platform fees. In this prototype payouts are simulated
            and no money moves.
          </p>
          <p className="mt-2">
            <strong className="text-foreground">Estimated profit</strong> also subtracts the expenses you record here. It is a planning estimate, not accounting or tax advice.
          </p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="min-w-0 rounded-2xl border bg-card p-5 shadow-soft sm:p-6" aria-labelledby="rev-chart">
          <h2 id="rev-chart" className="mb-1 text-xl">
            Net ticket revenue
          </h2>
          <p className="mb-4 text-xs text-muted-foreground">By booking date, after refunds{series.length > 45 ? ", weekly" : ""}</p>
          {f.bookings ? <RevenueChart data={series} /> : <p className="py-16 text-center text-sm text-muted-foreground">No bookings in this period.</p>}
        </section>
        <section className="min-w-0 rounded-2xl border bg-card p-5 shadow-soft sm:p-6" aria-labelledby="book-chart">
          <h2 id="book-chart" className="mb-1 text-xl">
            Booking trends
          </h2>
          <p className="mb-4 text-xs text-muted-foreground">Bookings made and later cancelled, by booking date</p>
          {f.bookings ? <BookingTrendChart data={series} /> : <p className="py-16 text-center text-sm text-muted-foreground">No bookings in this period.</p>}
        </section>
      </div>

      <section className="rounded-2xl border bg-card p-5 shadow-soft sm:p-6" aria-labelledby="perf-title">
        <h2 id="perf-title" className="mb-1 text-xl">
          Event performance
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">Occupancy per event across its dates in this period</p>
        {eventOcc.length ? <HorizontalBars data={eventOcc} dataKey="occupancy" name="Occupancy" format="percent" /> : null}
        <div className="mt-6">
          <PerformanceTable
            rows={perf.map((p) => ({
              sessionId: p.sessionId,
              event: p.event,
              startsAt: p.startsAt.toISOString(),
              dateLabel: formatDateTime(p.startsAt),
              status: p.status,
              capacity: p.capacity,
              ticketsSold: p.ticketsSold,
              occupancy: p.occupancy,
              revenueCents: p.revenueCents,
              cancellations: p.cancellations,
            }))}
          />
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-soft sm:p-6" aria-labelledby="exp-title">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="exp-title" className="text-xl">
            Expenses
          </h2>
          <p className="text-sm text-muted-foreground tabular-nums">{formatMoney(f.expensesCents)} in this period</p>
        </div>
        <div className="mb-6 rounded-xl border bg-background p-4">
          <h3 className="mb-3 text-sm font-medium">Add an expense</h3>
          <ExpenseForm
            events={events}
            initial={{ experienceId: events[0]?.id ?? "", sessionId: "", category: "INGREDIENTS", description: "", amountDollars: "", incurredOn: isoDateNY(now) }}
          />
        </div>
        {data.expenses.length ? (
          <ul className="divide-y">
            {data.expenses.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">
                    {e.description} <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-normal">{EXPENSE_CATEGORIES[e.category] ?? e.category}</span>
                  </p>
                  <p className="text-muted-foreground">
                    {e.experience.title}
                    {e.session ? ` · ${formatDate(e.session.startsAt)}` : " · whole event"} · paid {formatDate(e.incurredAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="mr-2 font-medium tabular-nums">{formatMoney(e.amountCents)}</span>
                  <ExpenseEditToggle
                    events={events}
                    initial={{
                      id: e.id,
                      experienceId: e.experienceId,
                      sessionId: e.sessionId ?? "",
                      category: e.category,
                      description: e.description,
                      amountDollars: (e.amountCents / 100).toFixed(2),
                      incurredOn: isoDateNY(e.incurredAt),
                    }}
                  />
                  <form action={deleteExpenseAction}>
                    <input type="hidden" name="id" value={e.id} />
                    <Button type="submit" size="icon-sm" variant="ghost" aria-label={`Delete expense ${e.description}`}>
                      <Trash2 aria-hidden />
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">No expenses recorded in this period.</p>
        )}
      </section>

      <SimulatedNote />
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <tr className={cn("border-b last:border-0", strong && "font-semibold")}>
      <th scope="row" className="py-2 text-left font-normal">
        <span className={cn(strong && "font-semibold")}>{label}</span>
      </th>
      <td className="py-2 text-right">{formatMoney(value)}</td>
    </tr>
  );
}
