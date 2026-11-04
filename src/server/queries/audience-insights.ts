import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { safeBuckets, safeCount, segmentAllowed, MIN_SEGMENT_SIZE, type BucketList } from "@/lib/analytics/privacy";
import { db } from "@/lib/db";

/**
 * Culinary Demand Insights: AGGREGATED stated guest preferences for hosts.
 *
 * Everything is counted in Postgres and only (dimension, key, count) rows leave the database,
 * so no guest id, name or individual profile is ever loaded here. Privacy thresholds from
 * src/lib/analytics/privacy.ts are applied before anything is returned.
 *
 * Counting rules
 * - One row per guest (GuestPreferences is unique per guest and edited in place), so a guest who
 *   edits their profile moves from one bucket to another instead of being counted twice.
 * - Each guest counts once per option they selected (count DISTINCT guests). Multi-select
 *   dimensions can add up to more than 100%.
 * - Eligible guests: anyone with at least one stated preference (neighborhood, travel time, day,
 *   time slot, social preference, category, cuisine or dish). These are stated interests, not
 *   bookings; booking demand lives in Culinary Trends.
 * - Current values only: there is no preference history table, so no trend over time is implied.
 */

export type AudienceFilters = {
  neighborhood?: string;
  category?: string;
  cuisine?: string;
  day?: string;
  timeSlot?: string;
};

export const AUDIENCE_DIMENSIONS = ["category", "cuisine", "dish", "day", "time", "attendance", "neighborhood", "travel"] as const;
export type AudienceDimension = (typeof AUDIENCE_DIMENSIONS)[number];

type CountRow = { dim: string; key: string; guests: number };
type CrossRow = { dim: string; a: string; b: string; guests: number };

function audienceCte(f: AudienceFilters) {
  const v = (x: string | undefined) => (x ? x : null);
  return Prisma.sql`
    WITH prefs AS (
      SELECT p."id",
             p."guestProfileId" AS gid,
             p."locationKey" AS hood,
             p."maxTravelMinutes" AS travel,
             p."attendancePreference"::text AS attendance,
             string_to_array(NULLIF(p."favoriteCategories", ''), ',') AS cats,
             string_to_array(NULLIF(p."favoriteCuisines", ''), ',') AS cuisines,
             string_to_array(NULLIF(p."preferredDays", ''), ',') AS days,
             string_to_array(NULLIF(p."preferredTimes", ''), ',') AS times,
             COALESCE((SELECT array_agg(d."dishKey") FROM "GuestFavoriteDish" d WHERE d."preferencesId" = p."id"), '{}') AS dishes,
             u."isDemo" AS demo
      FROM "GuestPreferences" p
      JOIN "GuestProfile" g ON g."id" = p."guestProfileId"
      JOIN "User" u ON u."id" = g."userId"
    ),
    eligible AS (
      SELECT * FROM prefs
      WHERE hood <> 'nyc' OR travel IS NOT NULL OR attendance IS NOT NULL
         OR cats IS NOT NULL OR cuisines IS NOT NULL OR days IS NOT NULL OR times IS NOT NULL
         OR cardinality(dishes) > 0
    ),
    seg AS (
      SELECT * FROM eligible
      WHERE (${v(f.neighborhood)}::text IS NULL OR hood = ${v(f.neighborhood)}::text)
        AND (${v(f.category)}::text IS NULL OR ${v(f.category)}::text = ANY(cats))
        AND (${v(f.cuisine)}::text IS NULL OR ${v(f.cuisine)}::text = ANY(cuisines))
        AND (${v(f.day)}::text IS NULL OR ${v(f.day)}::text = ANY(days))
        AND (${v(f.timeSlot)}::text IS NULL OR ${v(f.timeSlot)}::text = ANY(times))
    )`;
}

export type AudienceInsights = {
  basis: "stated-preferences";
  /** "simulated" when every eligible guest is fictional demo data (label it in the UI). */
  dataSource: "simulated" | "live" | "mixed";
  eligibleGuests: number;
  filters: AudienceFilters;
  segment: { allowed: false; minimum: number } | { allowed: true; guests: number };
  breakdowns: Record<AudienceDimension, BucketList> | null;
  /** Weekday × time slot cells; null guests = under the privacy threshold. */
  heatmap: { day: string; time: string; guests: number | null }[] | null;
  /** Top dishes by primary neighborhood (only cells above the threshold). */
  dishByNeighborhood: { dish: string; neighborhood: string; guests: number }[] | null;
  /** Category interest among guests who also chose each cuisine (for rule-based insights). */
  categoryByCuisine: { cuisine: string; category: string; guests: number }[] | null;
  /**
   * Actual behaviour, kept apart from stated interest: segment guests with at least one confirmed or
   * completed booking in each category (all recorded bookings; no time trend is implied).
   * null guests = under the privacy threshold.
   */
  bookedByCategory: { category: string; guests: number | null }[] | null;
};

/** Aggregated, privacy-safe audience insights. Filters combine with AND. */
export async function getAudienceInsights(filters: AudienceFilters = {}): Promise<AudienceInsights> {
  const cte = audienceCte(filters);
  const [totals] = await db.$queryRaw<{ eligible: number; segment: number; demo: number }[]>`
    ${cte}
    SELECT (SELECT count(*)::int FROM eligible) AS eligible,
           (SELECT count(*)::int FROM seg) AS segment,
           (SELECT count(*)::int FROM eligible WHERE demo) AS demo`;
  const dataSource = totals.eligible > 0 && totals.demo === totals.eligible ? "simulated" : totals.demo === 0 ? "live" : "mixed";
  const base = { basis: "stated-preferences" as const, dataSource: dataSource as AudienceInsights["dataSource"], eligibleGuests: totals.eligible, filters };

  if (!segmentAllowed(totals.segment)) {
    return { ...base, segment: { allowed: false, minimum: MIN_SEGMENT_SIZE }, breakdowns: null, heatmap: null, dishByNeighborhood: null, categoryByCuisine: null, bookedByCategory: null };
  }

  const counts = await db.$queryRaw<CountRow[]>`
    ${cte}
    SELECT 'category' AS dim, k AS key, count(DISTINCT id)::int AS guests FROM seg, unnest(cats) k GROUP BY k
    UNION ALL SELECT 'cuisine', k, count(DISTINCT id)::int FROM seg, unnest(cuisines) k GROUP BY k
    UNION ALL SELECT 'dish', k, count(DISTINCT id)::int FROM seg, unnest(dishes) k GROUP BY k
    UNION ALL SELECT 'day', k, count(DISTINCT id)::int FROM seg, unnest(days) k GROUP BY k
    UNION ALL SELECT 'time', k, count(DISTINCT id)::int FROM seg, unnest(times) k GROUP BY k
    UNION ALL SELECT 'attendance', attendance, count(*)::int FROM seg WHERE attendance IS NOT NULL GROUP BY attendance
    UNION ALL SELECT 'neighborhood', hood, count(*)::int FROM seg WHERE hood <> 'nyc' GROUP BY hood
    UNION ALL SELECT 'travel', travel::text, count(*)::int FROM seg WHERE travel IS NOT NULL GROUP BY travel`;

  const cross = await db.$queryRaw<CrossRow[]>`
    ${cte}
    SELECT 'heat' AS dim, d AS a, t AS b, count(DISTINCT id)::int AS guests FROM seg, unnest(days) d, unnest(times) t GROUP BY d, t
    UNION ALL SELECT 'dishHood', k, hood, count(DISTINCT id)::int FROM seg, unnest(dishes) k WHERE hood <> 'nyc' GROUP BY k, hood
    UNION ALL SELECT 'catCuisine', c, k, count(DISTINCT id)::int FROM seg, unnest(cuisines) c, unnest(cats) k GROUP BY c, k`;

  const booked = await db.$queryRaw<{ category: string; guests: number }[]>`
    ${cte}
    SELECT e."category"::text AS category, count(DISTINCT seg.gid)::int AS guests
    FROM seg
    JOIN "Booking" b ON b."guestId" = seg.gid AND b."status" IN ('CONFIRMED', 'COMPLETED')
    JOIN "ExperienceSession" s ON s."id" = b."sessionId"
    JOIN "Experience" e ON e."id" = s."experienceId"
    GROUP BY e."category"`;

  const breakdowns = Object.fromEntries(
    AUDIENCE_DIMENSIONS.map((dim) => [dim, safeBuckets(counts.filter((r) => r.dim === dim).map((r) => ({ key: r.key, guests: r.guests })), totals.segment)]),
  ) as Record<AudienceDimension, BucketList>;

  return {
    ...base,
    segment: { allowed: true, guests: totals.segment },
    breakdowns,
    heatmap: cross.filter((r) => r.dim === "heat").map((r) => ({ day: r.a, time: r.b, guests: safeCount(r.guests) })),
    dishByNeighborhood: cross
      .filter((r) => r.dim === "dishHood" && safeCount(r.guests) !== null)
      .map((r) => ({ dish: r.a, neighborhood: r.b, guests: r.guests }))
      .sort((x, y) => y.guests - x.guests),
    categoryByCuisine: cross
      .filter((r) => r.dim === "catCuisine" && safeCount(r.guests) !== null)
      .map((r) => ({ cuisine: r.a, category: r.b, guests: r.guests }))
      .sort((x, y) => y.guests - x.guests),
    bookedByCategory: booked.map((r) => ({ category: r.category, guests: safeCount(r.guests) })),
  };
}

/**
 * Compact, privacy-safe demand summary for AI-assisted event creation: top options per dimension
 * (already thresholded), never individual guests.
 */
export async function getEventCreationContext(filters: AudienceFilters = {}, top = 5) {
  const insights = await getAudienceInsights(filters);
  const pick = (dim: AudienceDimension) => insights.breakdowns?.[dim].buckets.slice(0, top) ?? [];
  return {
    dataSource: insights.dataSource,
    eligibleGuests: insights.eligibleGuests,
    segment: insights.segment,
    topCategories: pick("category"),
    topCuisines: pick("cuisine"),
    topDishes: pick("dish"),
    topDays: pick("day"),
    topTimes: pick("time"),
    topNeighborhoods: pick("neighborhood"),
    attendance: pick("attendance"),
    categoryByCuisine: (insights.categoryByCuisine ?? []).slice(0, top),
  };
}
