import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { X } from "lucide-react";

import { DateRangePicker } from "@/components/discover/date-range-picker";
import { FiltersForm } from "@/components/discover/filters-form";
import { MobileFilters } from "@/components/discover/mobile-filters";
import { SortSelect } from "@/components/discover/sort-select";
import { ExperienceCard } from "@/components/experiences/experience-card";
import { EmptyState } from "@/components/site/empty-state";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/demo";
import { CATEGORIES } from "@/lib/domain/categories";
import { boroughKeyOf, getBorough, getNeighborhood } from "@/lib/domain/neighborhoods";
import { cuisineLabel, FORMATS, HOST_TYPES, occasionLabel } from "@/lib/domain/taxonomy";
import {
  COLLECTIONS,
  DEFAULT_DISCOVER_SORT,
  SORTS,
  activeFilterCount,
  applyFilters,
  filtersToQuery,
  parseFilters,
  type DiscoveryFilters,
} from "@/lib/discovery/filters";
import { WHEN_OPTIONS, whenDays } from "@/lib/discovery/dates";
import { groupByDate } from "@/lib/discovery/grouping";
import { resolveLocation } from "@/lib/discovery/location";
import { formatDate, isoDateNY } from "@/lib/format";
import { nyDateTime } from "@/lib/clock";
import { requestNow } from "@/lib/request-clock";
import { getSavedIds } from "@/server/queries/guest";
import { getListings } from "@/server/queries/listings";
import { personalizeResults } from "@/server/queries/recommendations";
import { DiscoverSkeleton } from "./skeleton";

export const metadata: Metadata = { title: "Discover" };

export default function DiscoverPage({ searchParams }: PageProps<"/discover">) {
  return (
    <Suspense fallback={<DiscoverSkeleton />}>
      <Discover searchParams={searchParams} />
    </Suspense>
  );
}

type Chip = { label: string; href: string };

function chipsFor(f: DiscoveryFilters): Chip[] {
  const without = (patch: Partial<DiscoveryFilters>) => {
    const qs = filtersToQuery({ ...f, ...patch });
    return qs ? `/discover?${qs}` : "/discover";
  };
  const chips: Chip[] = [];
  if (f.collection) chips.push({ label: COLLECTIONS.find((c) => c.key === f.collection)!.title, href: without({ collection: undefined }) });
  if (f.q) chips.push({ label: `“${f.q}”`, href: without({ q: undefined }) });
  const { wholeBoroughs } = resolveLocation(f.borough, f.neighborhood);
  for (const b of wholeBoroughs) chips.push({ label: getBorough(b)!.name, href: without({ borough: f.borough.filter((x) => x !== b) }) });
  for (const k of f.neighborhood) {
    const n = getNeighborhood(k)!;
    chips.push({ label: n.name, href: without({ neighborhood: f.neighborhood.filter((x) => x !== k), borough: f.borough.filter((x) => x !== boroughKeyOf(n) || f.neighborhood.some((y) => y !== k && boroughKeyOf(getNeighborhood(y)!) === x)) }) });
  }
  if (f.near) chips.push({ label: `Near ${getNeighborhood(f.near)!.name}`, href: without({ near: undefined, within: undefined }) });
  if (f.near && f.within) chips.push({ label: `Within ${f.within} mi`, href: without({ within: undefined }) });
  const dateLabel = (iso: string) => formatDate(nyDateTime(iso, 12), { weekday: "short", month: "short", day: "numeric" });
  const noDates = { when: undefined, date: undefined, from: undefined, to: undefined };
  if (f.when && f.when !== "custom") chips.push({ label: WHEN_OPTIONS.find((o) => o.key === f.when)!.label, href: without(noDates) });
  else if (f.when === "custom") {
    const first = f.from ?? f.to ?? f.date;
    const last = f.from && f.to && f.to > f.from ? f.to : null;
    if (first) chips.push({ label: last ? `${dateLabel(first)} – ${dateLabel(last)}` : `Date: ${dateLabel(first)}`, href: without(noDates) });
  } else {
    if (f.date) chips.push({ label: `Date: ${dateLabel(f.date)}`, href: without({ date: undefined }) });
    else if (f.from && f.to && f.to >= f.from) chips.push({ label: `Dates: ${dateLabel(f.from)} – ${dateLabel(f.to)}`, href: without(noDates) });
    else {
      if (f.from) chips.push({ label: `From ${dateLabel(f.from)}`, href: without({ from: undefined }) });
      if (f.to) chips.push({ label: `Until ${dateLabel(f.to)}`, href: without({ to: undefined }) });
    }
  }
  for (const slug of f.category)
    chips.push({ label: CATEGORIES.find((c) => c.slug === slug)!.shortName, href: without({ category: f.category.filter((x) => x !== slug) }) });
  for (const k of f.cuisine) chips.push({ label: cuisineLabel(k), href: without({ cuisine: f.cuisine.filter((x) => x !== k) }) });
  for (const k of f.occasion) chips.push({ label: occasionLabel(k), href: without({ occasion: f.occasion.filter((x) => x !== k) }) });
  for (const k of f.host) chips.push({ label: HOST_TYPES[k].label, href: without({ host: f.host.filter((x) => x !== k) }) });
  for (const k of f.format) chips.push({ label: FORMATS[k], href: without({ format: f.format.filter((x) => x !== k) }) });
  if (f.minPrice !== undefined) chips.push({ label: `From $${f.minPrice}`, href: without({ minPrice: undefined }) });
  if (f.maxPrice !== undefined) chips.push({ label: `Up to $${f.maxPrice}`, href: without({ maxPrice: undefined }) });
  if (f.spots) chips.push({ label: `${f.spots}+ spots`, href: without({ spots: undefined }) });
  return chips;
}

async function Discover({ searchParams }: { searchParams: PageProps<"/discover">["searchParams"] }) {
  const filters = parseFilters(await searchParams);
  const now = await requestNow();
  const [listings, user] = await Promise.all([getListings(now.toISOString()), getCurrentUser()]);
  const saved = await getSavedIds(user?.guestProfile?.id);
  // Discover opens chronologically ("Date: Soonest First"), grouped by day; other sorts stay one grid.
  const sort = filters.sort ?? DEFAULT_DISCOVER_SORT;
  const filtered = applyFilters(listings, { ...filters, sort }, now);
  // "Recommended" sort is personal for guests with preferences: same results, ordered by fit.
  const prefs = user?.guestProfile?.preferences;
  const personal = sort === "recommended" && prefs?.onboardingCompletedAt ? await personalizeResults(prefs, filtered) : null;
  const results = personal ? personal.map((p) => p.listing) : filtered;
  const reasons = new Map((personal ?? []).filter((p) => p.reason).map((p) => [p.listing.id, p.reason!]));
  const groups = sort === "soonest" ? groupByDate(results, now) : null;
  const chips = chipsFor(filters);
  const count = activeFilterCount(filters);
  const collection = COLLECTIONS.find((c) => c.key === filters.collection);
  const category = filters.category.length === 1 ? CATEGORIES.find((c) => c.slug === filters.category[0]) : undefined;
  const title = collection?.title ?? category?.name ?? "Discover";
  // One chosen day (from the calendar, or Choose Dates with a single date): say which day.
  const singleDay = !filters.when ? filters.date : filters.when === "custom" && !filters.to ? (filters.from ?? filters.date) : undefined;
  const singleDayLabel = singleDay ? formatDate(nyDateTime(singleDay, 12), { weekday: "long", month: "long", day: "numeric" }) : null;
  // What the date picker shows: a day (?date=), a range (?from=&to=), or an older quick-date link.
  const quick = filters.when && filters.when !== "custom" ? whenDays(filters.when, now) : null;
  const pickStart = quick?.first ?? filters.date ?? filters.from;
  const pickEnd = quick ? quick.last : filters.date ? undefined : filters.to;

  return (
    <div className="container-page pt-8 sm:pt-12">
      <header className="mb-8 max-w-3xl">
        <p className="eyebrow mb-2">New York City</p>
        <h1 className="text-4xl leading-tight sm:text-5xl">{title}</h1>
        <p className="mt-3 text-muted-foreground">
          {collection?.blurb ?? category?.description ?? "Supper clubs, classes, pop-ups and social dining, from hosts across the five boroughs."}
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[17rem_1fr]">
        <aside className="hidden lg:block" aria-label="Filters">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2 [scrollbar-width:thin]">
            <FiltersForm filters={filters} />
          </div>
        </aside>

        <section aria-labelledby="results-heading">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <MobileFilters filters={filters} count={count} />
              <h2 id="results-heading" className="font-sans text-sm font-medium text-muted-foreground" aria-live="polite">
                {results.length} {results.length === 1 ? "experience" : "experiences"}
                {singleDayLabel && <> on {singleDayLabel}</>}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <DateRangePicker start={pickStart} end={pickEnd} today={isoDateNY(now)} />
              <SortSelect value={sort} defaultValue={DEFAULT_DISCOVER_SORT} />
            </div>
          </div>

          {chips.length > 0 && (
            <ul className="mb-6 flex flex-wrap gap-2" aria-label="Active filters">
              {chips.map((c) => (
                <li key={c.label + c.href}>
                  <Link
                    href={c.href}
                    scroll={false}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-card py-1 pr-2 pl-3 text-[13px] transition-colors hover:border-foreground/30"
                    aria-label={`Remove filter: ${c.label}`}
                  >
                    {c.label}
                    <X className="size-3.5 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/discover" className="inline-flex py-1 text-[13px] text-brand underline-offset-4 hover:underline">
                  Clear all
                </Link>
              </li>
            </ul>
          )}

          {results.length === 0 ? (
            <EmptyState
              title="No experiences match these filters"
              description="Try a wider date range, a bigger travel distance, or fewer filters. Sold-out dates still appear unless you ask for available spots."
            >
              <Button asChild>
                <Link href="/discover">Clear all filters</Link>
              </Button>
              {filters.borough.length + filters.neighborhood.length > 0 ? (
                <Button asChild variant="outline">
                  <Link href={`/discover?${filtersToQuery({ ...filters, borough: [], neighborhood: [] })}`}>Search all of NYC</Link>
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <Link href="/discover?collection=this-weekend">See this weekend</Link>
                </Button>
              )}
            </EmptyState>
          ) : groups ? (
            <ul className="space-y-12" aria-label="Results">
              {groups.map((g, gi) => (
                <li key={g.date}>
                  <section aria-labelledby={`day-${g.date}`}>
                    <h3 id={`day-${g.date}`} className="mb-5 border-b pb-3 text-2xl">
                      {g.label}
                    </h3>
                    <ul className="grid gap-x-5 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
                      {g.items.map((l, i) => (
                        <li key={`${l.id}-${g.date}`}>
                          <ExperienceCard listing={l} saved={saved.has(l.id)} priority={gi === 0 && i < 3} />
                        </li>
                      ))}
                    </ul>
                  </section>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="grid gap-x-5 gap-y-10 sm:grid-cols-2 xl:grid-cols-3" aria-label="Results">
              {results.map((l, i) => (
                <li key={l.id}>
                  <ExperienceCard listing={l} saved={saved.has(l.id)} priority={i < 3} reason={reasons.get(l.id)} />
                </li>
              ))}
            </ul>
          )}
          <p className="mt-10 text-xs text-muted-foreground">
            Sorted by {SORTS.find((s) => s.key === sort)!.label.toLowerCase()}
            {personal ? ", using your preferences to order results (nothing is hidden)" : ""}. All listings are fictional samples.
          </p>
        </section>
      </div>
    </div>
  );
}
