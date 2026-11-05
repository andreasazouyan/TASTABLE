import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { X } from "lucide-react";

import { FiltersForm } from "@/components/discover/filters-form";
import { MobileFilters } from "@/components/discover/mobile-filters";
import { SortSelect } from "@/components/discover/sort-select";
import { ExperienceCard } from "@/components/experiences/experience-card";
import { EmptyState } from "@/components/site/empty-state";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/demo";
import { CATEGORIES } from "@/lib/domain/categories";
import {
  COLLECTIONS,
  DEFAULT_DISCOVER_SORT,
  SORTS,
  activeFilterCount,
  applyFilters,
  filtersToQuery,
  parseFilters,
} from "@/lib/discovery/filters";
import { groupByDate } from "@/lib/discovery/grouping";
import { requestNow } from "@/lib/request-clock";
import { chipsFor } from "@/lib/discovery/chips";
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
  const chips = chipsFor(filters, "/discover");
  const count = activeFilterCount(filters);
  const collection = COLLECTIONS.find((c) => c.key === filters.collection);
  const category = filters.category.length === 1 ? CATEGORIES.find((c) => c.slug === filters.category[0]) : undefined;
  const title = collection?.title ?? category?.name ?? "Discover";

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
              </h2>
            </div>
            <SortSelect value={sort} defaultValue={DEFAULT_DISCOVER_SORT} />
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
