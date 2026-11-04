import type { ExperienceCategory } from "@/generated/prisma/enums";
import { MIN_BUCKET_SIZE, MIN_SEGMENT_SIZE, type Bucket, type BucketList } from "@/lib/analytics/privacy";
import { CATEGORIES, CATEGORY_IDS, getCategory } from "@/lib/domain/categories";
import { dishLabel } from "@/lib/domain/dishes";
import { getNeighborhood } from "@/lib/domain/neighborhoods";
import { cuisineLabel } from "@/lib/domain/taxonomy";
import { ATTENDANCE, DAYS, DAY_KEYS, OPEN_TO_EVERYTHING, PREFERENCE_CUISINE_KEYS, TIME_SLOT_KEYS, TIME_SLOT_PREFS, preferenceCuisineLabel } from "@/lib/domain/preferences";
import { formatPercent } from "@/lib/format";

/**
 * Pure helpers for Culinary Demand Insights (host analytics over AGGREGATED stated guest
 * preferences). The data comes from getAudienceInsights(), which has already applied the privacy
 * thresholds; nothing here ever sees an individual guest.
 */

export type DemandFilters = { neighborhood?: string; category?: string; cuisine?: string; day?: string; timeSlot?: string };
export type DemandDimension = "category" | "cuisine" | "dish" | "day" | "time" | "attendance" | "neighborhood" | "travel";

/** Shape of the aggregated insights this module reads (a subset of AudienceInsights). */
export type DemandData = {
  segment: { allowed: false; minimum: number } | { allowed: true; guests: number };
  breakdowns: Record<DemandDimension, BucketList> | null;
  heatmap: { day: string; time: string; guests: number | null }[] | null;
  categoryByCuisine: { cuisine: string; category: string; guests: number }[] | null;
  bookedByCategory: { category: string; guests: number | null }[] | null;
};

type SearchParams = Record<string, string | string[] | undefined>;

/** Reads filters from the URL, keeping only values from the shared vocabularies. */
export function parseDemandFilters(sp: SearchParams): DemandFilters {
  const one = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string) : undefined);
  const pick = (k: string, allowed: readonly string[]) => {
    const v = one(k);
    return v && allowed.includes(v) ? v : undefined;
  };
  const hood = one("neighborhood");
  const f: DemandFilters = {
    neighborhood: hood && getNeighborhood(hood) ? hood : undefined,
    category: pick("category", CATEGORY_IDS),
    cuisine: pick("cuisine", PREFERENCE_CUISINE_KEYS),
    day: pick("day", DAY_KEYS),
    timeSlot: pick("time", TIME_SLOT_KEYS),
  };
  return Object.fromEntries(Object.entries(f).filter(([, v]) => v)) as DemandFilters;
}

export function activeDemandFilterCount(f: DemandFilters) {
  return Object.values(f).filter(Boolean).length;
}

/** Human labels for every stored key, one place for the whole dashboard. */
export function demandLabel(dim: DemandDimension, key: string): string {
  switch (dim) {
    case "category":
      return CATEGORIES.find((c) => c.id === key)?.name ?? key;
    case "cuisine":
      return preferenceCuisineLabel(key) ?? cuisineLabel(key);
    case "dish":
      return dishLabel(key);
    case "day":
      return DAYS.find((d) => d.key === key)?.label ?? key;
    case "time":
      return TIME_SLOT_PREFS.find((t) => t.key === key)?.label ?? key;
    case "attendance":
      return ATTENDANCE[key as keyof typeof ATTENDANCE]?.label ?? key;
    case "neighborhood":
      return getNeighborhood(key)?.name ?? key;
    case "travel":
      return `Up to ${key} minutes`;
  }
}

/** Buckets in the vocabulary's natural order (days, time slots), keeping suppressed ones as null. */
export function orderedBuckets(list: BucketList, keys: readonly string[]): { key: string; bucket: Bucket | null }[] {
  return keys.map((key) => ({ key, bucket: list.buckets.find((b) => b.key === key) ?? null }));
}

/** The top bucket, or every bucket tied for top. Ignores "Open to everything" for cuisines. */
export function leaders(list: BucketList | undefined, exclude: readonly string[] = []): Bucket[] {
  const visible = (list?.buckets ?? []).filter((b) => !exclude.includes(b.key));
  if (!visible.length) return [];
  return visible.filter((b) => b.guests === visible[0].guests);
}

export function peakDayTime(heatmap: DemandData["heatmap"]) {
  const cells = (heatmap ?? []).filter((c): c is { day: string; time: string; guests: number } => c.guests !== null);
  if (!cells.length) return null;
  const max = Math.max(...cells.map((c) => c.guests));
  const top = cells.filter((c) => c.guests === max).sort((a, b) => DAY_KEYS.indexOf(a.day as never) - DAY_KEYS.indexOf(b.day as never) || a.time.localeCompare(b.time));
  return { ...top[0], ties: top.length - 1 };
}

const PART_OF_DAY: Record<string, string> = {
  "12-14": "lunchtimes",
  "14-16": "afternoons",
  "16-18": "early evenings",
  "18-20": "evenings",
  "20-22": "evenings",
  "22-24": "late nights",
};

function joinLabels(labels: string[]) {
  return labels.length <= 1 ? (labels[0] ?? "") : `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;
}

function share(n: number, of: number) {
  return of ? n / of : 0;
}

/** Plural phrases for sentences ("Cooking classes are popular…"). */
const CATEGORY_PHRASE: Record<ExperienceCategory, string> = {
  SUPPER_CLUB_PRIVATE_DINING: "Supper clubs and private dinners",
  COOKING_CLASS_WORKSHOP: "Cooking classes",
  POPUP_EXCLUSIVE: "Pop-ups and exclusive experiences",
  SOCIAL_CULINARY: "Social culinary experiences",
};

export type SmartInsight = { id: string; text: string; support: string };

/** Minimum guests behind a cuisine before saying anything about its fans' category mix. */
export const MIN_CROSS_GROUP = MIN_SEGMENT_SIZE;

/**
 * Transparent, rule-based observations. Every rule states its supporting counts, only fires on
 * buckets that passed the privacy thresholds, and describes stated interest (not bookings) unless it
 * says otherwise. No forecasts, trends or invented confidence.
 */
export function smartInsights(d: DemandData): SmartInsight[] {
  if (!d.segment.allowed || !d.breakdowns) return [];
  const size = d.segment.guests;
  const b = d.breakdowns;
  const pct = (n: number) => formatPercent(share(n, size));
  const out: SmartInsight[] = [];

  const dishes = leaders(b.dish);
  if (dishes.length) {
    const names = dishes.map((x) => demandLabel("dish", x.key));
    out.push({
      id: "top-dish",
      text: dishes.length === 1 ? `${names[0]} is the most requested dish among this audience.` : `${joinLabels(names)} are tied as the most requested dishes among this audience.`,
      support: `${dishes[0].guests} of ${size} guests (${pct(dishes[0].guests)}) chose ${dishes.length === 1 ? "it" : "each"} as a favorite dish.`,
    });
  }

  const peak = peakDayTime(d.heatmap);
  if (peak) {
    const day = demandLabel("day", peak.day);
    out.push({
      id: "peak-time",
      text: `${day} ${PART_OF_DAY[peak.time] ?? ""} (${demandLabel("time", peak.time)}) are the most preferred time${peak.ties ? `, tied with ${peak.ties} other slot${peak.ties === 1 ? "" : "s"}` : ""}.`,
      support: `${peak.guests} of ${size} guests (${pct(peak.guests)}) picked both ${day} and ${demandLabel("time", peak.time)}.`,
    });
  }

  // Category × cuisine: the category a cuisine's fans over-index on, versus the whole audience.
  const cuisineSize = new Map((b.cuisine.buckets ?? []).map((x) => [x.key, x.guests]));
  const categoryShare = new Map((b.category.buckets ?? []).map((x) => [x.key, share(x.guests, size)]));
  const pairs = (d.categoryByCuisine ?? [])
    .filter((p) => p.cuisine !== OPEN_TO_EVERYTHING && (cuisineSize.get(p.cuisine) ?? 0) >= MIN_CROSS_GROUP)
    .map((p) => {
      const fans = cuisineSize.get(p.cuisine)!;
      const s = share(p.guests, fans);
      return { ...p, fans, share: s, lift: s - (categoryShare.get(p.category) ?? 0) };
    })
    .filter((p) => p.share >= 0.5 && p.lift > 0)
    .sort((x, y) => y.lift - x.lift || y.guests - x.guests || x.cuisine.localeCompare(y.cuisine));
  if (pairs[0]) {
    const p = pairs[0];
    const cat = getCategory(p.category as ExperienceCategory);
    const cuisine = demandLabel("cuisine", p.cuisine);
    out.push({
      id: "category-by-cuisine",
      text: `${CATEGORY_PHRASE[cat.id]} are popular among guests interested in ${cuisine} cuisine.`,
      support: `${p.guests} of ${p.fans} ${cuisine} fans (${formatPercent(p.share)}) chose ${cat.name}, compared with ${formatPercent(categoryShare.get(p.category) ?? 0)} of this audience.`,
    });
  }

  const social = b.attendance.buckets[0];
  if (social && share(social.guests, size) >= 0.4) {
    out.push({
      id: "social",
      text: `The largest group prefers to go out "${demandLabel("attendance", social.key).toLowerCase()}".`,
      support: `${social.guests} of ${size} guests (${pct(social.guests)}). Guests choose one option, so these shares add up to at most 100%.`,
    });
  }

  const travel = b.travel.buckets.filter((x) => Number(x.key) >= 30).reduce((n, x) => n + x.guests, 0);
  const travelAnswered = b.travel.buckets.reduce((n, x) => n + x.guests, 0);
  if (travelAnswered >= MIN_SEGMENT_SIZE && travel > 0) {
    out.push({
      id: "travel",
      text: `${formatPercent(share(travel, travelAnswered))} of guests who set a travel time will go 30 minutes or more.`,
      support: `${travel} of ${travelAnswered} guests with a stated maximum travel time (visible options only).`,
    });
  }

  // Stated interest versus what this audience has actually booked.
  const topCat = b.category.buckets[0];
  if (topCat) {
    const booked = d.bookedByCategory?.find((x) => x.category === topCat.key)?.guests;
    const name = demandLabel("category", topCat.key);
    out.push({
      id: "interest-vs-bookings",
      text: `${name} draws the most stated interest.`,
      support:
        booked == null
          ? `${topCat.guests} guests (${pct(topCat.guests)}) chose it. Fewer than ${MIN_BUCKET_SIZE} of this audience have booked one, so bookings aren't shown.`
          : `${topCat.guests} guests (${pct(topCat.guests)}) chose it; ${booked} guests in this audience have actually booked one. Interest and bookings are counted separately.`,
    });
  }

  return out;
}
