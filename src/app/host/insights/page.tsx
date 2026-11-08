import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Lightbulb, ShieldCheck } from "lucide-react";

import { inputClass } from "@/components/host/field";
import { PageHeader, SimulatedNote, StatTile } from "@/components/host/stat-tile";
import { NeighborhoodOptions } from "@/components/site/neighborhood-options";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  activeDemandFilterCount,
  demandLabel,
  leaders,
  orderedBuckets,
  parseDemandFilters,
  peakDayTime,
  smartInsights,
  type DemandDimension,
} from "@/lib/analytics/demand-insights";
import { MIN_BUCKET_SIZE, MIN_SEGMENT_SIZE, type Bucket, type BucketList } from "@/lib/analytics/privacy";
import { requireHost } from "@/lib/auth/demo";
import { CATEGORIES } from "@/lib/domain/categories";
import { ATTENDANCE_IDS, DAYS, DAY_KEYS, OPEN_TO_EVERYTHING, PREFERENCE_CUISINES, TIME_SLOT_KEYS, TIME_SLOT_PREFS, TRAVEL_TIMES } from "@/lib/domain/preferences";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getAudienceInsights, type AudienceInsights } from "@/server/queries/audience-insights";

export const metadata: Metadata = { title: "Culinary Demand Insights" };

export default function DemandInsightsPage(props: PageProps<"/host/insights">) {
  return (
    <div>
      <PageHeader
        title="Culinary Demand Insights"
        description="What guests say they want, from aggregated onboarding and profile preferences. This is stated interest, not bookings: see Culinary Trends for what's actually selling."
      />
      <Suspense
        fallback={
          <div className="space-y-6" aria-busy="true" aria-label="Loading demand insights">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-80 rounded-2xl" />
          </div>
        }
      >
        <Insights {...props} />
      </Suspense>
    </div>
  );
}

async function Insights({ searchParams }: PageProps<"/host/insights">) {
  await requireHost("/host/insights");
  const filters = parseDemandFilters(await searchParams);
  const data = await getAudienceInsights(filters);
  const filtered = activeDemandFilterCount(filters) > 0;

  return (
    <div className="space-y-8">
      <Filters filters={filters} filtered={filtered} />

      {data.dataSource !== "live" && (
        <SimulatedNote>
          {data.dataSource === "simulated"
            ? "Every guest preference here belongs to a fictional demo guest, so these figures describe sample data, not the NYC market."
            : "Some guest preferences here belong to fictional demo guests."}{" "}
          Figures are current answers only; there&apos;s no preference history, so nothing here is a trend over time.
        </SimulatedNote>
      )}

      {!data.segment.allowed || !data.breakdowns ? (
        <section aria-labelledby="privacy-title" className="rounded-2xl border border-dashed bg-muted/40 p-6">
          <h2 id="privacy-title" className="flex items-center gap-2 text-xl">
            <ShieldCheck className="size-5 text-brand" aria-hidden /> Audience too small to show
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            These filters match fewer than {MIN_SEGMENT_SIZE} guests. To protect guest privacy, Tastable doesn&apos;t show breakdowns for audiences this small. Remove a
            filter to widen the audience.
          </p>
          <p className="mt-3 text-sm">{data.eligibleGuests} guests have shared preferences in total.</p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href="/host/insights">Clear filters</Link>
          </Button>
        </section>
      ) : (
        <Dashboard data={data as AllowedInsights} filtered={filtered} />
      )}

      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
        Privacy: hosts only see counts. Audiences under {MIN_SEGMENT_SIZE} guests show no breakdown, and any option chosen by fewer than {MIN_BUCKET_SIZE} guests is hidden
        (including one-off custom dishes). Each guest counts once per option they chose, and profile edits replace their earlier answers, so no one is counted twice.
      </p>
    </div>
  );
}

type AllowedInsights = AudienceInsights & { segment: { allowed: true; guests: number }; breakdowns: Record<DemandDimension, BucketList> };

function Dashboard({ data, filtered }: { data: AllowedInsights; filtered: boolean }) {
  const b = data.breakdowns;
  const size = data.segment.guests;
  const peak = peakDayTime(data.heatmap);
  const top = (dim: DemandDimension, exclude: string[] = []) => {
    const l = leaders(b[dim], exclude);
    return l.length ? { value: l.map((x) => demandLabel(dim, x.key)).join(" / "), detail: `${l[0].guests} guests · ${formatPercent(l[0].guests / size)}` } : { value: "—", detail: "Not enough answers to show" };
  };
  const cat = top("category");
  const cuisine = top("cuisine", [OPEN_TO_EVERYTHING]);
  const dish = top("dish");
  const insights = smartInsights(data);
  const topDishes = b.dish.buckets.slice(0, 10);

  return (
    <>
      <section aria-labelledby="overview-title">
        <h2 id="overview-title" className="mb-4 text-2xl">
          Audience overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatTile label="Eligible guests" value={String(data.eligibleGuests)} detail="Guests who've shared at least one preference" />
          <StatTile label="In this audience" value={String(size)} detail={filtered ? "Guests matching every selected filter" : "No filters applied: all eligible guests"} emphasis />
          <StatTile label="Most popular category" value={cat.value} detail={cat.detail} />
          <StatTile label="Most popular cuisine" value={cuisine.value} detail={cuisine.detail} />
          <StatTile label="Most requested dish" value={dish.value} detail={dish.detail} />
          <StatTile
            label="Most preferred day and time"
            value={peak ? `${demandLabel("day", peak.day)}, ${demandLabel("time", peak.time)}` : "—"}
            detail={peak ? `${peak.guests} guests picked both · ${formatPercent(peak.guests / size)}` : "Not enough answers to show"}
          />
        </div>
      </section>

      <section aria-labelledby="smart-title" className="rounded-2xl border bg-card p-5 shadow-soft sm:p-6">
        <h2 id="smart-title" className="mb-1 flex items-center gap-2 text-xl">
          <Lightbulb className="size-5 text-brand" aria-hidden /> Smart insights
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">Rule-based observations from the counts on this page, each with the numbers behind it. Not generated by an AI model.</p>
        {insights.length ? (
          <ul className="grid gap-3 md:grid-cols-2" aria-label="Smart insights">
            {insights.map((i) => (
              <li key={i.id} className="rounded-xl border bg-background p-4">
                <p className="font-medium">{i.text}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{i.support}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Not enough answers in this audience for an observation yet.</p>
        )}
      </section>

      <Section id="categories" title="Experience demand" subtitle="Guests can choose up to three categories, so the percentages can add up to more than 100%.">
        <BarTable
          caption="Interest in each experience category"
          head={["Category", "Interested guests", "Share of audience", "Guests who booked one"]}
          rows={CATEGORIES.map((c) => ({ key: c.id, label: c.name, bucket: b.category.buckets.find((x) => x.key === c.id) ?? null }))}
          size={size}
          extra={(key) => {
            const booked = data.bookedByCategory?.find((x) => x.category === key)?.guests;
            return booked == null ? <Hidden /> : booked;
          }}
        />
        <p className="mt-3 text-xs text-muted-foreground">&ldquo;Guests who booked one&rdquo; counts actual confirmed or completed bookings by guests in this audience, kept separate from stated interest.</p>
      </Section>

      <Section id="cuisines" title="Cuisine demand" subtitle="Ranked by unique interested guests. Guests can choose several cuisines.">
        <BarTable caption="Cuisine interest, ranked" head={["Cuisine", "Interested guests", "Share of audience"]} rows={b.cuisine.buckets.map((x) => ({ key: x.key, label: demandLabel("cuisine", x.key), bucket: x }))} size={size} ranked />
        <Suppressed n={b.cuisine.suppressedOptions} />
      </Section>

      <Section id="dishes" title="Most requested dishes" subtitle="Top 10 from onboarding and profile selections. Equivalent entries (like “gelato” and “ice cream”) are counted together as one dish.">
        <BarTable
          caption="Top 10 dishes"
          head={["Dish", "Interested guests", "Share of audience", "Top neighborhoods"]}
          rows={topDishes.map((x) => ({ key: x.key, label: demandLabel("dish", x.key), bucket: x }))}
          size={size}
          ranked
          extra={(key) => {
            const cells = (data.dishByNeighborhood ?? []).filter((c) => c.dish === key).slice(0, 3);
            return cells.length ? cells.map((c) => `${demandLabel("neighborhood", c.neighborhood)} (${c.guests})`).join(", ") : <Hidden text="Too few per neighborhood" />;
          }}
        />
        <Suppressed n={b.dish.suppressedOptions} />
      </Section>

      <Section id="when" title="When guests want to go out" subtitle="Preferred days and the two-hour time slots from onboarding (New York time).">
        <div className="grid gap-6 lg:grid-cols-2">
          <BarTable caption="Preferred days" head={["Day", "Guests", "Share"]} rows={orderedBuckets(b.day, DAY_KEYS).map(({ key, bucket }) => ({ key, label: demandLabel("day", key), bucket }))} size={size} />
          <BarTable caption="Preferred time slots" head={["Time slot", "Guests", "Share"]} rows={orderedBuckets(b.time, TIME_SLOT_KEYS).map(({ key, bucket }) => ({ key, label: demandLabel("time", key), bucket }))} size={size} />
        </div>
        <h3 className="mt-6 mb-2 text-base">Day and time heatmap</h3>
        <PreferenceHeatmap cells={data.heatmap ?? []} size={size} />
      </Section>

      <Section id="social" title="Social preferences" subtitle="How guests like to attend. Each guest picks one answer.">
        <Proportions list={b.attendance} keys={ATTENDANCE_IDS} size={size} />
      </Section>

      <Section id="location" title="Location insights" subtitle="Guests' home neighborhood and the longest they'll travel. Travel time is stated, not derived from distance.">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <BarTable caption="Demand by neighborhood" head={["Neighborhood", "Guests", "Share"]} rows={b.neighborhood.buckets.map((x) => ({ key: x.key, label: demandLabel("neighborhood", x.key), bucket: x }))} size={size} ranked />
            <Suppressed n={b.neighborhood.suppressedOptions} />
          </div>
          <BarTable
            caption="Preferred maximum travel time"
            head={["Travel time", "Guests", "Share"]}
            rows={TRAVEL_TIMES.map((t) => ({ key: String(t.minutes), label: demandLabel("travel", String(t.minutes)), bucket: b.travel.buckets.find((x) => x.key === String(t.minutes)) ?? null }))}
            size={size}
          />
        </div>
      </Section>
    </>
  );
}

function Filters({ filters, filtered }: { filters: ReturnType<typeof parseDemandFilters>; filtered: boolean }) {
  return (
    <form action="/host/insights" className="rounded-2xl border bg-card p-4 shadow-soft sm:p-5" aria-label="Audience filters">
      <div className="flex flex-wrap items-end gap-3">
        <FilterSelect id="neighborhood" label="Neighborhood" value={filters.neighborhood}>
          <NeighborhoodOptions />
        </FilterSelect>
        <FilterSelect id="category" label="Experience category" value={filters.category}>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect id="cuisine" label="Cuisine" value={filters.cuisine}>
          {PREFERENCE_CUISINES.filter((c) => c.key !== OPEN_TO_EVERYTHING).map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect id="day" label="Preferred day" value={filters.day}>
          {DAYS.map((d) => (
            <option key={d.key} value={d.key}>
              {d.label}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect id="time" label="Preferred time slot" value={filters.timeSlot}>
          {TIME_SLOT_PREFS.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </FilterSelect>
        <div className="flex gap-2">
          <Button type="submit">Apply filters</Button>
          {filtered && (
            <Button asChild variant="ghost">
              <Link href="/host/insights">Clear</Link>
            </Button>
          )}
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Filters combine: the audience is guests who match every one you choose.</p>
    </form>
  );
}

function FilterSelect({ id, label, value, children }: { id: string; label: string; value?: string; children: React.ReactNode }) {
  return (
    <div className="w-full sm:w-auto">
      <label htmlFor={`f-${id}`} className="mb-1 block text-xs text-muted-foreground">
        {label}
      </label>
      <select id={`f-${id}`} name={id} defaultValue={value ?? ""} className={cn(inputClass, "w-full sm:w-48")}>
        <option value="">All</option>
        {children}
      </select>
    </div>
  );
}

function Section({ id, title, subtitle, children }: { id: string; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`${id}-title`} className="rounded-2xl border bg-card p-5 shadow-soft sm:p-6">
      <h2 id={`${id}-title`} className="text-xl">
        {title}
      </h2>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">{subtitle}</p>
      {children}
    </section>
  );
}

function Hidden({ text = `Fewer than ${MIN_BUCKET_SIZE}` }: { text?: string }) {
  return <span className="text-xs text-muted-foreground">{text}</span>;
}

function Suppressed({ n }: { n: number }) {
  if (!n) return null;
  return (
    <p className="mt-3 text-xs text-muted-foreground">
      {n} more {n === 1 ? "option was" : "options were"} chosen by fewer than {MIN_BUCKET_SIZE} guests and {n === 1 ? "is" : "are"} hidden for privacy.
    </p>
  );
}

/** A ranked table whose share column is drawn as a bar: the chart and its accessible data in one. */
function BarTable({
  caption,
  head,
  rows,
  size,
  ranked,
  extra,
}: {
  caption: string;
  head: string[];
  rows: { key: string; label: string; bucket: Bucket | null }[];
  size: number;
  ranked?: boolean;
  extra?: (key: string) => React.ReactNode;
}) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">No option has at least {MIN_BUCKET_SIZE} guests in this audience yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[28rem] text-sm">
        <caption className="mb-2 text-left text-sm font-medium">{caption}</caption>
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            {head.map((h, i) => (
              <th key={h} scope="col" className={cn("px-2 py-2 font-medium", i === 0 ? "text-left" : i === 2 ? "w-[40%] text-left" : "text-right")}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const s = r.bucket ? r.bucket.guests / size : 0;
            return (
              <tr key={r.key} className="border-b last:border-0">
                <th scope="row" className="px-2 py-2 text-left font-medium">
                  {ranked && <span className="mr-2 text-xs text-muted-foreground tabular-nums">{i + 1}.</span>}
                  {r.label}
                </th>
                <td className="px-2 py-2 text-right tabular-nums">{r.bucket ? r.bucket.guests : <Hidden />}</td>
                <td className="px-2 py-2">
                  {r.bucket ? (
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                        <div className="h-full rounded-full bg-[var(--chart-1)]" style={{ width: `${Math.min(100, s * 100)}%` }} />
                      </div>
                      <span className="w-11 text-right tabular-nums">{formatPercent(s)}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Hidden</span>
                  )}
                </td>
                {extra && <td className="px-2 py-2 text-right">{extra(r.key)}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Proportions({ list, keys, size }: { list: BucketList; keys: readonly string[]; size: number }) {
  const rows = keys.map((k) => ({ key: k, bucket: list.buckets.find((b) => b.key === k) ?? null }));
  const answered = rows.reduce((n, r) => n + (r.bucket?.guests ?? 0), 0);
  const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];
  return (
    <div>
      {answered > 0 && (
        <div className="mb-4 flex h-4 overflow-hidden rounded-full bg-muted" aria-hidden>
          {rows.map((r, i) => (r.bucket ? <div key={r.key} style={{ width: `${(r.bucket.guests / size) * 100}%`, background: colors[i] }} /> : null))}
        </div>
      )}
      <ul className="grid gap-3 sm:grid-cols-3" aria-label="Social preferences">
        {rows.map((r, i) => (
          <li key={r.key} className="rounded-xl border bg-background p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <span className="size-2.5 rounded-full" style={{ background: colors[i] }} aria-hidden />
              {demandLabel("attendance", r.key)}
            </p>
            <p className="mt-1 font-display text-2xl tabular-nums">{r.bucket ? formatPercent(r.bucket.guests / size) : "—"}</p>
            <p className="text-xs text-muted-foreground">{r.bucket ? `${r.bucket.guests} guests` : `Fewer than ${MIN_BUCKET_SIZE} guests`}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">Shares are of everyone in this audience; guests who skipped the question aren&apos;t in any group.</p>
    </div>
  );
}

function PreferenceHeatmap({ cells, size }: { cells: { day: string; time: string; guests: number | null }[]; size: number }) {
  const max = Math.max(1, ...cells.map((c) => c.guests ?? 0));
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] border-separate border-spacing-[3px] text-xs">
        <caption className="sr-only">Guests who chose both the day (column) and the time slot (row). Cells with fewer than {MIN_BUCKET_SIZE} guests are hidden.</caption>
        <thead>
          <tr>
            <th scope="col" className="w-28" />
            {DAYS.map((d) => (
              <th key={d.key} scope="col" className="pb-1 font-medium text-muted-foreground">
                {d.short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TIME_SLOT_PREFS.map((t) => (
            <tr key={t.key}>
              <th scope="row" className="pr-2 text-left font-medium whitespace-nowrap text-muted-foreground">
                {t.label}
              </th>
              {DAYS.map((d) => {
                const n = cells.find((c) => c.day === d.key && c.time === t.key)?.guests ?? null;
                const v = n ? n / max : 0;
                return (
                  <td
                    key={d.key}
                    title={`${d.label} ${t.label}: ${n ? `${n} guests (${formatPercent(n / size)})` : `fewer than ${MIN_BUCKET_SIZE} guests`}`}
                    className="h-11 rounded-md text-center font-semibold tabular-nums"
                    style={{
                      background: n ? `color-mix(in oklab, var(--chart-1) ${Math.round(15 + v * 85)}%, var(--card))` : "var(--muted)",
                      color: v >= 0.55 ? "#fff" : "var(--foreground)",
                    }}
                  >
                    {n ?? <span className="font-normal text-muted-foreground">–</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted-foreground">Numbers are guests who picked both that day and that slot. “–” means fewer than {MIN_BUCKET_SIZE} guests (hidden).</p>
    </div>
  );
}
