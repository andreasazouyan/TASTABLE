import { isBookable } from "@/lib/booking/capacity";
import { CATEGORIES } from "@/lib/domain/categories";
import { boroughKeyForName, BOROUGHS, getNeighborhood, type BoroughKey } from "@/lib/domain/neighborhoods";
import { applyFilters, filtersSchema, popularityOrder } from "@/lib/discovery/filters";
import type { Listing, ListingMatch } from "@/lib/discovery/types";

/**
 * Pure building blocks for the personalized guest Home page. Every section reads the same
 * listings as Discover and Calendar (getListings), so counts, saves and dates always agree.
 * Each function returns distinct listings (no duplicate cards within a section).
 */

export const HOME_ROW_SIZE = 6;

/**
 * Manhattan's "Experiences in your area" row spreads across these neighborhoods first, in this
 * order, before repeating a neighborhood or using others.
 */
export const MANHATTAN_SPOTLIGHT = [
  "upper-west-side",
  "upper-east-side",
  "chelsea",
  "soho",
  "west-village",
  "east-village",
  "hells-kitchen",
  "financial-district",
  "harlem",
  "morningside-heights",
] as const;

const bookableSession = (s: ListingMatch["sessions"][number], now: Date) =>
  isBookable({ ...s, seatsReserved: s.capacity - s.seatsLeft, status: "SCHEDULED" }, now);

/**
 * Upcoming and relevant: published listings with at least one future session that can still be
 * booked, matched to that session. Sold-out and past-only listings stay on Discover and Calendar.
 */
export function upcomingForHome(listings: Listing[], now: Date): ListingMatch[] {
  return applyFilters(listings, filtersSchema.parse({ sort: "soonest" }), now).filter(
    (l) => !!l.matched && bookableSession(l.matched, now),
  );
}

const unique = <T extends { id: string }>(items: T[]) => {
  const seen = new Set<string>();
  return items.filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
};

/** Upcoming experiences per category, keyed by category id. */
export function categoryCounts(upcoming: Pick<Listing, "category">[]) {
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c.id, 0])) as Record<string, number>;
  for (const l of upcoming) counts[l.category] = (counts[l.category] ?? 0) + 1;
  return counts;
}

/** "Popular in NYC": most saved first (ties: recent views, then slug). */
export function popularRow(upcoming: ListingMatch[], limit = HOME_ROW_SIZE) {
  return unique([...upcoming].sort(popularityOrder)).slice(0, limit);
}

/** "Featured Experiences": only listings explicitly flagged `featured`, soonest first. */
export function featuredRow(upcoming: ListingMatch[], limit = HOME_ROW_SIZE) {
  return unique(upcoming.filter((l) => l.featured)).slice(0, limit);
}

/** Interleaves groups: the first of each group, then the second of each, and so on. */
function roundRobin(groups: ListingMatch[][], limit: number) {
  const out: ListingMatch[] = [];
  for (let i = 0; out.length < limit && groups.some((g) => g[i]); i++) {
    for (const g of groups) if (g[i] && out.length < limit) out.push(g[i]);
  }
  return out;
}

function groupBy(items: ListingMatch[], key: (l: ListingMatch) => string) {
  const map = new Map<string, ListingMatch[]>();
  for (const l of items) map.set(key(l), [...(map.get(key(l)) ?? []), l]);
  return map;
}

export type AreaRow = { borough: BoroughKey | null; title: string; href: string; items: ListingMatch[] };

/**
 * "Experiences in [Borough]" from the guest's onboarding neighborhood: listings in that borough,
 * one per neighborhood before any neighborhood repeats (Manhattan follows MANHATTAN_SPOTLIGHT
 * first). Without a location preference, or with no upcoming listing in the borough, it falls
 * back to "Explore NYC", spread across all five boroughs.
 */
export function areaRow(upcoming: ListingMatch[], locationKey: string | null | undefined, limit = HOME_ROW_SIZE): AreaRow {
  const hood = getNeighborhood(locationKey);
  const borough = hood ? boroughKeyForName(hood.borough) ?? null : null;
  const items = unique(upcoming);

  if (borough) {
    const inBorough = items.filter((l) => boroughKeyForName(l.venue.borough) === borough);
    if (inBorough.length) {
      const groups = groupBy(inBorough, (l) => l.venue.neighborhood);
      const rank = (name: string) => {
        const i = borough === "manhattan" ? MANHATTAN_SPOTLIGHT.findIndex((k) => getNeighborhood(k)?.name === name) : -1;
        return i === -1 ? MANHATTAN_SPOTLIGHT.length : i;
      };
      // Spotlight neighborhoods first, then the rest by their soonest date (groups keep date order).
      const ordered = [...groups.entries()]
        .sort(([a, ga], [b, gb]) => rank(a) - rank(b) || +ga[0].matched!.startsAt - +gb[0].matched!.startsAt)
        .map(([, g]) => g);
      const name = BOROUGHS.find((b) => b.key === borough)!.name;
      return { borough, title: `Experiences in ${name}`, href: `/discover?borough=${borough}`, items: roundRobin(ordered, limit) };
    }
  }

  const byBorough = groupBy(items, (l) => boroughKeyForName(l.venue.borough) ?? l.venue.borough);
  const ordered = BOROUGHS.map((b) => byBorough.get(b.key) ?? []).filter((g) => g.length);
  return { borough: null, title: "Explore NYC", href: "/discover", items: roundRobin(ordered, limit) };
}

/**
 * Fallback for "Recommended for You" when a guest has no preferences yet: a taste of every
 * category, taking the most saved experiences of each in turn, so the row shows range.
 */
export function starterRow(upcoming: ListingMatch[], limit = HOME_ROW_SIZE) {
  const byCategory = groupBy(unique([...upcoming].sort(popularityOrder)), (l) => l.category);
  return roundRobin(CATEGORIES.map((c) => byCategory.get(c.id) ?? []).filter((g) => g.length), limit);
}
