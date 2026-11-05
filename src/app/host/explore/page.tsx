import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { X } from "lucide-react";

import { FiltersForm } from "@/components/discover/filters-form";
import { MobileFilters } from "@/components/discover/mobile-filters";
import { SortSelect } from "@/components/discover/sort-select";
import { ExperienceCard } from "@/components/experiences/experience-card";
import { PageHeader } from "@/components/host/stat-tile";
import { EmptyState } from "@/components/site/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireHost } from "@/lib/auth/demo";
import { chipsFor } from "@/lib/discovery/chips";
import { DEFAULT_DISCOVER_SORT, SORTS, activeFilterCount, applyFilters, parseFilters } from "@/lib/discovery/filters";
import { groupByDate } from "@/lib/discovery/grouping";
import { requestNow } from "@/lib/request-clock";
import { getListings } from "@/server/queries/listings";

export const metadata: Metadata = { title: "Explore" };

const BASE = "/host/explore";

/**
 * Host Explore: every public (published) experience on Tastable, other hosts' included.
 * Same data, filters and cards as guest Discover, but links stay inside the host area.
 */
export default function ExplorePage({ searchParams }: PageProps<"/host/explore">) {
  return (
    <div>
      <PageHeader
        eyebrow="New York City"
        title="Explore"
        description="Every public experience on Tastable, including other hosts' events. See what's on, how it's priced and how fast it's filling."
      />
      <Suspense fallback={<ExploreSkeleton />}>
        <Explore searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Explore({ searchParams }: { searchParams: PageProps<"/host/explore">["searchParams"] }) {
  const { host } = await requireHost(BASE);
  const filters = parseFilters(await searchParams);
  const now = await requestNow();
  const listings = await getListings(now.toISOString());
  const sort = filters.sort ?? DEFAULT_DISCOVER_SORT;
  const results = applyFilters(listings, { ...filters, sort }, now);
  const groups = sort === "soonest" ? groupByDate(results, now) : null;
  const chips = chipsFor(filters, BASE);
  const count = activeFilterCount(filters);

  const card = (l: (typeof results)[number], priority: boolean) => (
    <div className="relative">
      <ExperienceCard listing={l} basePath={BASE} showSave={false} linkHost={false} priority={priority} />
      {l.host.id === host.id && (
        <span className="pointer-events-none absolute top-3 right-3 rounded-full bg-foreground px-2.5 py-1 text-[11px] font-semibold text-background">Your event</span>
      )}
    </div>
  );

  return (
    <div className="grid gap-10 xl:grid-cols-[16rem_1fr]">
      <aside className="hidden xl:block" aria-label="Filters">
        <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2 [scrollbar-width:thin]">
          <FiltersForm filters={filters} basePath={BASE} showSearch />
        </div>
      </aside>

      <section aria-labelledby="results-heading">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="xl:hidden">
              <MobileFilters filters={filters} count={count} basePath={BASE} showSearch />
            </div>
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
              <Link href={BASE} className="inline-flex py-1 text-[13px] text-brand underline-offset-4 hover:underline">
                Clear all
              </Link>
            </li>
          </ul>
        )}

        {results.length === 0 ? (
          <EmptyState title="No experiences match these filters" description="Try a wider date range, a different neighborhood, or fewer filters.">
            <Button asChild>
              <Link href={BASE}>Clear all filters</Link>
            </Button>
          </EmptyState>
        ) : groups ? (
          <ul className="space-y-12" aria-label="Results">
            {groups.map((g, gi) => (
              <li key={g.date}>
                <section aria-labelledby={`day-${g.date}`}>
                  <h3 id={`day-${g.date}`} className="mb-5 border-b pb-3 text-2xl">
                    {g.label}
                  </h3>
                  <ul className="grid gap-x-5 gap-y-10 sm:grid-cols-2 2xl:grid-cols-3">
                    {g.items.map((l, i) => (
                      <li key={`${l.id}-${g.date}`}>{card(l, gi === 0 && i < 3)}</li>
                    ))}
                  </ul>
                </section>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="grid gap-x-5 gap-y-10 sm:grid-cols-2 2xl:grid-cols-3" aria-label="Results">
            {results.map((l, i) => (
              <li key={l.id}>{card(l, i < 3)}</li>
            ))}
          </ul>
        )}
        <p className="mt-10 text-xs text-muted-foreground">
          Sorted by {SORTS.find((s) => s.key === sort)!.label.toLowerCase()}. Shows published experiences from all hosts; drafts and private events are never listed. All
          listings are fictional samples.
        </p>
      </section>
    </div>
  );
}

function ExploreSkeleton() {
  return (
    <div className="grid gap-10 xl:grid-cols-[16rem_1fr]" aria-busy="true" aria-label="Loading experiences">
      <Skeleton className="hidden h-96 rounded-2xl xl:block" />
      <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="aspect-[4/3] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
