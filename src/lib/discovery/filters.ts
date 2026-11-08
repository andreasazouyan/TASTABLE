import { z } from "zod";

import { isBookable } from "@/lib/booking/capacity";
import { nyDateTime } from "@/lib/clock";
import { dateWindow, WHEN_KEYS } from "@/lib/discovery/dates";
import { CATEGORIES } from "@/lib/domain/categories";
import { locationMatcher } from "@/lib/discovery/location";
import { BOROUGH_KEYS, distanceMiles, getNeighborhood, NEIGHBORHOODS } from "@/lib/domain/neighborhoods";
import { CUISINE_KEYS, FORMAT_IDS, HOST_TYPE_IDS, OCCASION_KEYS } from "@/lib/domain/taxonomy";
import { isoDateNY } from "@/lib/format";
import type { Listing, ListingMatch, ListingSession } from "@/lib/discovery/types";

/**
 * Discovery filters live in the URL so every view is shareable. Each param is parsed
 * leniently: an invalid value is dropped rather than breaking the page.
 */
const csv = <T extends string>(allowed: readonly T[]) =>
  z
    .string()
    .optional()
    .transform((v) => (v ? v.split(",").filter((x): x is T => (allowed as readonly string[]).includes(x)) : []))
    .catch([]);

const categorySlugs = CATEGORIES.map((c) => c.slug);

export const SORTS = [
  { key: "recommended", label: "Recommended" },
  { key: "soonest", label: "Date: Soonest First" },
  { key: "price-asc", label: "Price: low to high" },
  { key: "price-desc", label: "Price: high to low" },
  { key: "spots", label: "Most spots left" },
  { key: "newest", label: "Newest" },
] as const;
export type SortKey = (typeof SORTS)[number]["key"];
/** Discover opens chronologically when no sort is chosen. */
export const DEFAULT_DISCOVER_SORT: SortKey = "soonest";

export const COLLECTIONS = [
  { key: "this-weekend", title: "This Weekend", blurb: "Friday to Sunday, with seats still open." },
  { key: "one-of-a-kind", title: "Experiences You Won't Find Anywhere Else", blurb: "Pop-ups, galleries, rooftops and secret rooms." },
  { key: "for-two", title: "Perfect for Two", blurb: "Intimate tables and date-night formats." },
  { key: "meet-people", title: "Meet New People", blurb: "Communal tables where most guests come solo." },
  { key: "under-60", title: "Under $60", blurb: "Big nights out that don't stretch the budget." },
  { key: "creators-chefs", title: "Hosted by Creators & Chefs", blurb: "Private chefs, culinary pros and food creators." },
  { key: "limited", title: "Limited Spots", blurb: "Only a few seats left on the next date." },
  { key: "hidden-gems", title: "Hidden Gems in NYC", blurb: "Smaller hosts guests keep coming back to." },
] as const;
export type CollectionKey = (typeof COLLECTIONS)[number]["key"];

export const filtersSchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  category: csv(categorySlugs),
  cuisine: csv(CUISINE_KEYS),
  host: csv(HOST_TYPE_IDS),
  occasion: csv(OCCASION_KEYS),
  format: csv(FORMAT_IDS),
  borough: csv(BOROUGH_KEYS),
  neighborhood: csv(NEIGHBORHOODS.map((n) => n.key)),
  near: z.string().optional().refine((v) => !v || !!getNeighborhood(v)).catch(undefined),
  within: z.coerce.number().int().refine((v) => [1, 2, 5, 10].includes(v)).optional().catch(undefined),
  when: z.enum(WHEN_KEYS).optional().catch(undefined),
  date: z.iso.date().optional().catch(undefined),
  from: z.iso.date().optional().catch(undefined),
  to: z.iso.date().optional().catch(undefined),
  minPrice: z.coerce.number().int().min(0).max(1000).optional().catch(undefined),
  maxPrice: z.coerce.number().int().min(0).max(1000).optional().catch(undefined),
  spots: z.coerce.number().int().min(1).max(8).optional().catch(undefined),
  collection: z.enum(COLLECTIONS.map((c) => c.key) as [CollectionKey, ...CollectionKey[]]).optional().catch(undefined),
  sort: z.enum(SORTS.map((s) => s.key) as [SortKey, ...SortKey[]]).optional().catch(undefined),
});

export type DiscoveryFilters = z.infer<typeof filtersSchema>;

/** Accepts Next.js searchParams (string | string[]) and returns validated filters. */
export function parseFilters(params: Record<string, string | string[] | undefined>): DiscoveryFilters {
  const flat = Object.fromEntries(Object.entries(params).map(([k, v]) => [k, Array.isArray(v) ? v.join(",") : v]));
  return filtersSchema.parse(flat);
}

/** Serialises filters back to a query string (stable key order, empty values dropped). */
export function filtersToQuery(f: Partial<DiscoveryFilters>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) {
      if (v.length) sp.set(k, v.join(","));
    } else sp.set(k, String(v));
  }
  return sp.toString();
}

export function activeFilterCount(f: DiscoveryFilters) {
  let n = 0;
  for (const k of ["category", "cuisine", "host", "occasion", "format"] as const) n += f[k].length ? 1 : 0;
  for (const k of ["q", "near", "minPrice", "maxPrice", "spots", "collection"] as const) n += f[k] !== undefined ? 1 : 0;
  if (f.borough.length || f.neighborhood.length) n += 1;
  return n;
}

/** Friday 00:00 → Monday 00:00 (New York) of the current or upcoming weekend. */
export function weekendWindow(now: Date) {
  const today = isoDateNY(now);
  const [y, m, d] = today.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const toFriday = dow === 6 ? -1 : dow === 0 ? -2 : 5 - dow;
  const friday = new Date(Date.UTC(y, m - 1, d + toFriday)).toISOString().slice(0, 10);
  const monday = new Date(Date.UTC(y, m - 1, d + toFriday + 3)).toISOString().slice(0, 10);
  return { start: nyDateTime(friday), end: nyDateTime(monday) };
}

const ONE_OF_A_KIND_VENUES = ["GALLERY", "SECRET_LOCATION", "ROOFTOP"];
const CHEF_CREATOR_TYPES = ["PRIVATE_CHEF", "CREATOR_INFLUENCER", "CULINARY_PROFESSIONAL"];

export function inCollection(l: Listing, key: CollectionKey): boolean {
  switch (key) {
    case "this-weekend":
      return true; // handled by the session window
    case "one-of-a-kind":
      return l.category === "POPUP_EXCLUSIVE" || ONE_OF_A_KIND_VENUES.includes(l.venue.type);
    case "for-two":
      return l.occasions.includes("DATE_NIGHT");
    case "meet-people":
      return l.atmosphere === "MEET_NEW_PEOPLE" || l.occasions.includes("MEET_NEW_PEOPLE");
    case "under-60":
      return l.sessions.some((s) => s.priceCents <= 6000);
    case "creators-chefs":
      return CHEF_CREATOR_TYPES.includes(l.host.hostType);
    case "limited":
      return true; // handled by session availability
    case "hidden-gems":
      return l.host.followerCount < 10_000 && !l.featured;
  }
}

function intersect(a: { start: Date; end: Date } | null, b: { start: Date; end: Date } | null) {
  if (!a || !b) return a ?? b;
  return { start: new Date(Math.max(+a.start, +b.start)), end: new Date(Math.min(+a.end, +b.end)) };
}

function sessionWindow(f: DiscoveryFilters, now: Date): { start: Date; end: Date } | null {
  return intersect(f.collection === "this-weekend" ? weekendWindow(now) : null, dateWindow(f, now));
}

/**
 * Applies filters and sorting. Pure: give it the same listings, filters and clock and it
 * returns the same result. A listing matches when at least one upcoming session satisfies the
 * date and seat filters. Sold-out sessions can match (shown as sold out) unless `spots` is set.
 */
export function applyFilters(listings: Listing[], f: DiscoveryFilters, now: Date): ListingMatch[] {
  const categoryIds = f.category.map((slug) => CATEGORIES.find((c) => c.slug === slug)!.id as string);
  const origin = f.near ? getNeighborhood(f.near) : undefined;
  const window = sessionWindow(f, now);
  const q = f.q?.toLowerCase();
  const inLocation = locationMatcher(f.borough, f.neighborhood);

  const out: ListingMatch[] = [];
  for (const l of listings) {
    if (categoryIds.length && !categoryIds.includes(l.category)) continue;
    if (f.cuisine.length && !f.cuisine.includes(l.cuisine as never)) continue;
    if (f.host.length && !f.host.includes(l.host.hostType as never)) continue;
    if (f.format.length && !f.format.includes(l.format as never)) continue;
    if (f.occasion.length && !f.occasion.some((o) => l.occasions.includes(o))) continue;
    if (f.collection && !inCollection(l, f.collection)) continue;
    if (!inLocation(l.venue)) continue;
    if (q) {
      const hay = [l.title, l.summary, l.cuisine, l.host.displayName, l.venue.neighborhood, ...l.tags].join(" ").toLowerCase();
      if (!hay.includes(q)) continue;
    }

    const distance = origin ? distanceMiles(origin, l.venue) : null;
    if (origin && f.within && distance !== null && distance > f.within) continue;

    let sessions: ListingSession[] = l.sessions.filter((s) => s.availability !== "PAST" && s.availability !== "CANCELLED" && s.startsAt > now);
    if (window) sessions = sessions.filter((s) => s.startsAt >= window.start && s.startsAt < window.end);
    if (f.minPrice !== undefined) sessions = sessions.filter((s) => s.priceCents >= f.minPrice! * 100);
    if (f.maxPrice !== undefined) sessions = sessions.filter((s) => s.priceCents <= f.maxPrice! * 100);
    if (f.spots) sessions = sessions.filter((s) => s.seatsLeft >= f.spots!);
    if (f.collection === "this-weekend") sessions = sessions.filter((s) => s.seatsLeft > 0);
    if (f.collection === "under-60") sessions = sessions.filter((s) => s.priceCents <= 6000);
    if (f.collection === "limited") sessions = sessions.filter((s) => s.availability === "LIMITED");
    if (!sessions.length) continue;

    const bookable = sessions.find((s) => isBookable({ ...s, seatsReserved: s.capacity - s.seatsLeft, status: "SCHEDULED" }, now));
    out.push({ ...l, matched: bookable ?? sessions[0], matchedCount: sessions.length, matchedSessions: sessions, distance });
  }

  return sortListings(out, f.sort ?? (origin ? "recommended" : "recommended"));
}

export function sortListings(items: ListingMatch[], sort: SortKey): ListingMatch[] {
  const time = (x: ListingMatch) => x.matched?.startsAt.getTime() ?? Infinity;
  const price = (x: ListingMatch) => x.matched?.priceCents ?? x.ticketPriceCents;
  const soldOutLast = (a: ListingMatch, b: ListingMatch) =>
    Number(a.matched?.seatsLeft === 0) - Number(b.matched?.seatsLeft === 0);
  const sorted = [...items];
  sorted.sort((a, b) => {
    switch (sort) {
      case "soonest":
        return time(a) - time(b) || a.slug.localeCompare(b.slug);
      case "price-asc":
        return price(a) - price(b) || a.slug.localeCompare(b.slug);
      case "price-desc":
        return price(b) - price(a) || a.slug.localeCompare(b.slug);
      case "spots":
        return (b.matched?.seatsLeft ?? 0) - (a.matched?.seatsLeft ?? 0) || a.slug.localeCompare(b.slug);
      case "newest":
        return (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0) || a.slug.localeCompare(b.slug);
      default: {
        // Recommended: bookable first, then distance (if any), featured, popularity, date.
        return (
          soldOutLast(a, b) ||
          (a.distance ?? 0) - (b.distance ?? 0) ||
          Number(b.featured) - Number(a.featured) ||
          b.saves + b.views / 50 - (a.saves + a.views / 50) ||
          time(a) - time(b)
        );
      }
    }
  });
  return sorted;
}
