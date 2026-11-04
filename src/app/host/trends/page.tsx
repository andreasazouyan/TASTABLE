import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Info, Lightbulb } from "lucide-react";

import { HorizontalBars } from "@/components/host/charts";
import { inputClass } from "@/components/host/field";
import { DemandHeatmap } from "@/components/host/heatmap";
import { PageHeader, SimulatedNote } from "@/components/host/stat-tile";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MIN_SAMPLE_SEATS,
  MIN_SAMPLE_SESSIONS,
  MIN_SAMPLE_VIEWS,
  PRICE_BANDS,
  aggregate,
  cuisineGrowth,
  demandHeatmap,
  generateInsights,
  priceBand,
  type Group,
} from "@/lib/analytics/trends";
import { requireHost } from "@/lib/auth/demo";
import { nyWeekdayHour } from "@/lib/clock";
import { CATEGORIES, getCategory } from "@/lib/domain/categories";
import { CUISINES, MOTIVATIONS, OCCASIONS, cuisineLabel, occasionLabel } from "@/lib/domain/taxonomy";
import { formatPercent } from "@/lib/format";
import { requestNow } from "@/lib/request-clock";
import { cn } from "@/lib/utils";
import { getPreferenceCounts, getTrendRows } from "@/server/queries/host";

export const metadata: Metadata = { title: "Culinary Trends" };

const PERIODS = [30, 60, 90] as const;
const BOROUGHS = ["Manhattan", "Brooklyn", "Queens"] as const;

export default function TrendsPage(props: PageProps<"/host/trends">) {
  return (
    <div>
      <PageHeader
        title="Culinary Trends"
        description="What's filling, what's being saved, and when guests book, from Tastable's simulated marketplace data. Patterns here describe sample data only; they are not market research."
      />
      <Suspense
        fallback={
          <div className="space-y-6" aria-busy="true" aria-label="Loading trends">
            <Skeleton className="h-12 w-full max-w-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-80 rounded-2xl" />
          </div>
        }
      >
        <Trends {...props} />
      </Suspense>
    </div>
  );
}

async function Trends({ searchParams }: PageProps<"/host/trends">) {
  const { host } = await requireHost("/host/trends");
  const now = await requestNow();
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const scope = str("scope") === "mine" ? "mine" : "market";
  const days = PERIODS.find((p) => String(p) === str("period")) ?? 60;
  const category = CATEGORIES.find((c) => c.id === str("category"))?.id;
  const borough = BOROUGHS.find((b) => b === str("borough"));

  const [rows, prefs] = await Promise.all([
    getTrendRows(now, days, { hostId: scope === "mine" ? host.id : undefined, category, borough }),
    getPreferenceCounts(),
  ]);
  const { experiences, sessions, bookings } = rows;

  const byCuisine = aggregate(experiences, sessions, bookings, (e) => e.cuisine);
  const byCategory = aggregate(experiences, sessions, bookings, (e) => e.category);
  const byPriceBand = aggregate(experiences, sessions, bookings, (e) => priceBand(e.priceCents));
  const byNeighborhood = aggregate(experiences, sessions, bookings, (e) => e.neighborhood);
  const byOccasion = aggregate(experiences, sessions, bookings, (e) => e.occasions);
  const byWeekday = aggregate(experiences, sessions, [], (_e, s) => (s ? String(nyWeekdayHour(s.startsAt).weekday) : []), true);
  const heat = demandHeatmap(experiences, sessions);
  const growth = cuisineGrowth(experiences);
  const insights = generateInsights({
    byWeekday,
    byCuisine,
    byPriceBand,
    byCategory,
    labels: {
      cuisine: cuisineLabel,
      priceBand: (k) => PRICE_BANDS.find((b) => b.key === k)?.label ?? k,
      category: (k) => getCategory(k as never).name,
    },
  });

  const totalSessions = sessions.filter((s) => s.status !== "CANCELLED").length;
  const cuisinesSorted = [...byCuisine].sort((a, b) => b.bookings - a.bookings);
  const neighborhoodsSorted = [...byNeighborhood].sort((a, b) => b.bookings - a.bookings).slice(0, 10);
  const query = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const next: Record<string, string | undefined> = { scope, period: String(days), category, borough, ...patch };
    for (const [k, v] of Object.entries(next)) if (v) p.set(k, v);
    return `/host/trends?${p.toString()}`;
  };

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <nav aria-label="Data scope" className="inline-flex rounded-full border bg-card p-1">
          {(
            [
              ["mine", "My Performance"],
              ["market", "Marketplace Trends"],
            ] as const
          ).map(([k, label]) => (
            <Link
              key={k}
              href={query({ scope: k })}
              aria-current={scope === k ? "page" : undefined}
              className={cn("rounded-full px-4 py-1.5 text-sm transition-colors", scope === k ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
            >
              {label}
            </Link>
          ))}
        </nav>
        <form action="/host/trends" className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="scope" value={scope} />
          <Select id="period" label="Period" value={String(days)} options={PERIODS.map((p) => [String(p), `Last ${p} days`])} />
          <Select id="category" label="Category" value={category ?? ""} options={[["", "All categories"], ...CATEGORIES.map((c) => [c.id, c.shortName] as [string, string])]} />
          <Select id="borough" label="Borough" value={borough ?? ""} options={[["", "All boroughs"], ...BOROUGHS.map((b) => [b, b] as [string, string])]} />
          <Button type="submit" variant="outline" size="sm">
            Apply filters
          </Button>
        </form>
        <p className="text-sm text-muted-foreground">
          {scope === "mine" ? "Your events only" : "All hosts on the marketplace"} · {experiences.length} experiences · {totalSessions} sessions dated within {days} days either side of today ·
          bookings and views from the last {days} days.
        </p>
      </div>

      <section aria-labelledby="insights-title" className="rounded-2xl border bg-card p-5 shadow-soft sm:p-6">
        <h2 id="insights-title" className="mb-1 flex items-center gap-2 text-xl">
          <Lightbulb className="size-5 text-brand" aria-hidden /> Insights
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Simple rules over the figures below. Each one shows the metric it is based on. They describe simulated sample data and carry no statistical confidence.
        </p>
        <ul className="grid gap-3 md:grid-cols-2">
          {insights.map((i) => (
            <li key={i.id} className={cn("rounded-xl border p-4", i.status === "insufficient" ? "border-dashed bg-muted/40" : "bg-background")}>
              <p className={cn("font-medium", i.status === "insufficient" && "text-muted-foreground")}>{i.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{i.metric}</p>
            </li>
          ))}
        </ul>
      </section>

      {experiences.length === 0 ? (
        <InsufficientNotice text={scope === "mine" ? "You don't have published events with data for these filters yet. Switch to Marketplace Trends to see the wider picture." : "No experiences match these filters."} />
      ) : (
        <>
          <Section id="cuisines" title="Trending cuisines" subtitle="Bookings made, saves and listing views in the period. Growth compares views with the previous equal period.">
            <HorizontalBars data={cuisinesSorted.map((g) => ({ label: cuisineLabel(g.key), bookings: g.bookings }))} dataKey="bookings" name="Bookings" />
            <DataTable
              caption="Cuisine demand"
              head={["Cuisine", "Bookings", "Tickets", "Saves", "Views", "View growth"]}
              rows={cuisinesSorted.map((g) => {
                const gr = growth.get(g.key);
                return [cuisineLabel(g.key), g.bookings, g.tickets, g.saves, g.views, gr === null || gr === undefined ? <Low key="g" text={`Under ${MIN_SAMPLE_VIEWS} prior views`} /> : signed(gr)];
              })}
            />
          </Section>

          <Section id="categories" title="The four categories compared" subtitle="Fill rate = seats sold ÷ seats offered. Conversion = bookings ÷ listing views.">
            <HorizontalBars data={byCategory.map((g) => ({ label: getCategory(g.key as never).shortName, fillRate: g.fillRate }))} dataKey="fillRate" name="Fill rate" format="percent" />
            <DataTable
              caption="Category comparison"
              head={["Category", "Sessions", "Seats offered", "Fill rate", "Bookings", "Conversion"]}
              rows={CATEGORIES.map((c) => {
                const g = byCategory.find((x) => x.key === c.id);
                if (!g) return [c.name, 0, 0, <Low key="f" text="No sessions" />, 0, "—"];
                return [c.name, g.sessions, g.seatsOffered, fill(g), g.bookings, conv(g)];
              })}
            />
          </Section>

          <Section id="price" title="Price vs conversion" subtitle="Ticket price bands against how often a view turns into a booking, and how full sessions get. An association in sample data, not a price effect.">
            <HorizontalBars
              data={PRICE_BANDS.map((b) => ({ label: b.label, conversion: byPriceBand.find((g) => g.key === b.key)?.conversion ?? 0 }))}
              dataKey="conversion"
              name="Conversion"
              format="percent"
              fixedDomain={false}
            />
            <DataTable
              caption="Price band performance"
              head={["Price band", "Experiences", "Views", "Bookings", "Conversion", "Fill rate"]}
              rows={PRICE_BANDS.map((b) => {
                const g = byPriceBand.find((x) => x.key === b.key);
                const n = experiences.filter((e) => priceBand(e.priceCents) === b.key).length;
                if (!g) return [b.label, n, 0, 0, "—", <Low key="f" text="No sessions" />];
                return [b.label, n, g.views, g.bookings, conv(g), fill(g)];
              })}
            />
          </Section>

          <Section id="heatmap" title="Demand by day and time" subtitle="Seat fill rate for sessions starting in each weekday and time slot (New York time).">
            <DemandHeatmap rows={heat} minSessions={MIN_SAMPLE_SESSIONS} />
          </Section>

          <Section id="neighborhoods" title="Neighborhood demand" subtitle="Top neighborhoods by bookings in the period, with fill rate where the sample allows.">
            <HorizontalBars data={neighborhoodsSorted.map((g) => ({ label: g.key, bookings: g.bookings }))} dataKey="bookings" name="Bookings" />
            <DataTable
              caption="Neighborhood demand"
              head={["Neighborhood", "Sessions", "Bookings", "Fill rate", "Saves"]}
              rows={neighborhoodsSorted.map((g) => [g.key, g.sessions, g.bookings, fill(g), g.saves])}
            />
          </Section>

          <Section id="preferences" title="Guest preferences by occasion and cuisine" subtitle="What guests asked for during onboarding (marketplace-wide, counts of guests), and tickets booked by the occasions hosts tag their events with.">
            <PreferenceMatrix prefs={prefs} />
            <DataTable
              caption="Tickets by occasion"
              head={["Occasion tag", "Experiences", "Bookings", "Tickets", "Fill rate"]}
              rows={OCCASIONS.map((o) => {
                const g = byOccasion.find((x) => x.key === o.key);
                const n = experiences.filter((e) => e.occasions.includes(o.key)).length;
                return [occasionLabel(o.key), n, g?.bookings ?? 0, g?.tickets ?? 0, g ? fill(g) : <Low key="f" text="No sessions" />];
              })}
            />
          </Section>
        </>
      )}

      <SimulatedNote>
        Built from simulated bookings, saves and listing views on fictional sample data. Groups with fewer than {MIN_SAMPLE_SESSIONS} sessions or {MIN_SAMPLE_SEATS} seats, or fewer than{" "}
        {MIN_SAMPLE_VIEWS} views for conversion, are marked as low data rather than compared.
      </SimulatedNote>
    </div>
  );
}

function signed(r: number) {
  const s = formatPercent(Math.abs(r));
  return r > 0.005 ? `+${s}` : r < -0.005 ? `−${s}` : "No change";
}

function fill(g: Group) {
  if (g.fillRate === null) return "—";
  return g.enough ? formatPercent(g.fillRate) : <Low key="f" text={`${formatPercent(g.fillRate)}, low data`} />;
}

function conv(g: Group) {
  return g.conversion === null ? <Low key="c" text={`Under ${MIN_SAMPLE_VIEWS} views`} /> : formatPercent(g.conversion, 1);
}

function Low({ text }: { text: string }) {
  return <span className="text-xs text-muted-foreground italic">{text}</span>;
}

function InsufficientNotice({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-dashed bg-muted/40 p-5 text-sm text-muted-foreground" role="status">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>
        <strong className="text-foreground">Not enough data. </strong>
        {text}
      </p>
    </div>
  );
}

function Section({ id, title, subtitle, children }: { id: string; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`${id}-title`} className="rounded-2xl border bg-card p-5 shadow-soft sm:p-6">
      <h2 id={`${id}-title`} className="text-xl">
        {title}
      </h2>
      <p className="mb-5 text-xs text-muted-foreground">{subtitle}</p>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

function DataTable({ caption, head, rows }: { caption: string; head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[34rem] text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            {head.map((h, i) => (
              <th key={h} scope="col" className={cn("px-3 py-2 font-medium", i > 0 && "text-right")}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b last:border-0">
              {r.map((c, j) =>
                j === 0 ? (
                  <th key={j} scope="row" className="px-3 py-2 text-left font-medium">
                    {c}
                  </th>
                ) : (
                  <td key={j} className="px-3 py-2 text-right tabular-nums">
                    {c}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PreferenceMatrix({ prefs }: { prefs: { cuisines: string[]; motivations: string[] }[] }) {
  const answered = prefs.filter((p) => p.cuisines.length && p.motivations.length);
  if (answered.length < 10) {
    return <InsufficientNotice text={`Only ${answered.length} guests have shared both cuisines and motivations. At least 10 are needed before showing a breakdown.`} />;
  }
  const cuisineCounts = new Map<string, number>();
  for (const p of answered) for (const c of p.cuisines) cuisineCounts.set(c, (cuisineCounts.get(c) ?? 0) + 1);
  const topCuisines = CUISINES.filter((c) => cuisineCounts.has(c.key))
    .sort((a, b) => (cuisineCounts.get(b.key) ?? 0) - (cuisineCounts.get(a.key) ?? 0))
    .slice(0, 6);
  const max = Math.max(
    1,
    ...MOTIVATIONS.flatMap((m) => topCuisines.map((c) => answered.filter((p) => p.motivations.includes(m.key) && p.cuisines.includes(c.key)).length)),
  );
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[36rem] border-separate border-spacing-[3px] text-xs">
        <caption className="mb-2 text-left text-xs text-muted-foreground">
          Guests who chose both the motivation (row) and the cuisine (column). {answered.length} guests answered both. A guest can appear in several cells.
        </caption>
        <thead>
          <tr>
            <th scope="col" />
            {topCuisines.map((c) => (
              <th key={c.key} scope="col" className="pb-1 font-medium text-muted-foreground">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MOTIVATIONS.map((m) => (
            <tr key={m.key}>
              <th scope="row" className="pr-2 text-left font-medium text-muted-foreground">
                {m.label}
              </th>
              {topCuisines.map((c) => {
                const n = answered.filter((p) => p.motivations.includes(m.key) && p.cuisines.includes(c.key)).length;
                const share = n / max;
                return (
                  <td
                    key={c.key}
                    className="h-10 rounded-md text-center font-semibold tabular-nums"
                    style={{ background: n ? `color-mix(in oklab, var(--chart-1) ${Math.round(12 + share * 88)}%, var(--card))` : "var(--muted)", color: share >= 0.55 ? "#fff" : "var(--foreground)" }}
                  >
                    {n || "–"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Select({ id, label, value, options }: { id: string; label: string; value: string; options: (readonly [string, string])[] }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs text-muted-foreground">
        {label}
      </label>
      <select id={id} name={id} defaultValue={value} className={cn(inputClass, "w-44")}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}

