import { nyWeekdayHour } from "@/lib/clock";

/**
 * Culinary Trends: aggregations over simulated marketplace data, plus rule-based insights.
 * Insights only fire when each compared group meets MIN_SAMPLE; otherwise the UI shows an
 * insufficient-data notice. No statistical confidence is claimed.
 */
export const MIN_SAMPLE_SEATS = 40;
export const MIN_SAMPLE_SESSIONS = 4;
export const MIN_SAMPLE_VIEWS = 150;

export type TrendExperience = {
  id: string;
  title: string;
  cuisine: string;
  category: string;
  priceCents: number;
  neighborhood: string;
  borough: string;
  occasions: string[];
  views: number;
  viewsPrev: number;
  saves: number;
};

export type TrendSession = { experienceId: string; startsAt: Date; capacity: number; seatsReserved: number; status: string };
export type TrendBooking = { experienceId: string; ticketCount: number; status: string; createdAt: Date };

export type Group = {
  key: string;
  sessions: number;
  seatsOffered: number;
  seatsFilled: number;
  fillRate: number | null;
  bookings: number;
  tickets: number;
  views: number;
  conversion: number | null;
  saves: number;
  enough: boolean;
};

function emptyGroup(key: string): Group {
  return { key, sessions: 0, seatsOffered: 0, seatsFilled: 0, fillRate: null, bookings: 0, tickets: 0, views: 0, conversion: null, saves: 0, enough: false };
}

export const TIME_SLOTS = [
  { key: "midday", label: "Midday", from: 10, to: 15 },
  { key: "afternoon", label: "Afternoon", from: 15, to: 18 },
  { key: "evening", label: "Evening", from: 18, to: 21 },
  { key: "late", label: "Late", from: 21, to: 24 },
] as const;
export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function timeSlot(hour: number) {
  return TIME_SLOTS.find((s) => hour >= s.from && hour < s.to)?.key ?? "midday";
}

export const PRICE_BANDS = [
  { key: "under-60", label: "Under $60", min: 0, max: 6000 },
  { key: "60-99", label: "$60–$99", min: 6000, max: 10000 },
  { key: "100-139", label: "$100–$139", min: 10000, max: 14000 },
  { key: "140-plus", label: "$140+", min: 14000, max: Infinity },
] as const;

export function priceBand(cents: number) {
  return PRICE_BANDS.find((b) => cents >= b.min && cents < b.max)!.key;
}

export function aggregate(
  experiences: TrendExperience[],
  sessions: TrendSession[],
  bookings: TrendBooking[],
  keyOf: (e: TrendExperience, s?: TrendSession) => string | string[],
  bySession = false,
) {
  const groups = new Map<string, Group>();
  const get = (k: string) => groups.get(k) ?? (groups.set(k, emptyGroup(k)), groups.get(k)!);
  const expById = new Map(experiences.map((e) => [e.id, e]));
  const keys = (e: TrendExperience, s?: TrendSession) => [keyOf(e, s)].flat();

  for (const s of sessions) {
    const e = expById.get(s.experienceId);
    if (!e || s.status === "CANCELLED") continue;
    for (const k of keys(e, s)) {
      const g = get(k);
      g.sessions += 1;
      g.seatsOffered += s.capacity;
      g.seatsFilled += s.seatsReserved;
    }
  }
  if (!bySession) {
    for (const e of experiences) {
      for (const k of keys(e)) {
        const g = get(k);
        g.views += e.views;
        g.saves += e.saves;
      }
    }
    for (const b of bookings) {
      const e = expById.get(b.experienceId);
      if (!e || b.status === "CANCELLED") continue;
      for (const k of keys(e)) {
        const g = get(k);
        g.bookings += 1;
        g.tickets += b.ticketCount;
      }
    }
  }
  for (const g of groups.values()) {
    g.fillRate = g.seatsOffered ? g.seatsFilled / g.seatsOffered : null;
    g.conversion = g.views >= MIN_SAMPLE_VIEWS ? g.bookings / g.views : null;
    g.enough = g.seatsOffered >= MIN_SAMPLE_SEATS && g.sessions >= MIN_SAMPLE_SESSIONS;
  }
  return Array.from(groups.values());
}

export function demandHeatmap(experiences: TrendExperience[], sessions: TrendSession[]) {
  const groups = aggregate(
    experiences,
    sessions,
    [],
    (_e, s) => {
      if (!s) return [];
      const { weekday, hour } = nyWeekdayHour(s.startsAt);
      return `${weekday}:${timeSlot(hour)}`;
    },
    true,
  );
  const byKey = new Map(groups.map((g) => [g.key, g]));
  return TIME_SLOTS.map((slot) => ({
    slot: slot.label,
    cells: WEEKDAYS.map((day, i) => {
      const g = byKey.get(`${i}:${slot.key}`);
      return { day, sessions: g?.sessions ?? 0, seatsOffered: g?.seatsOffered ?? 0, fillRate: g?.fillRate ?? null };
    }),
  }));
}

/** Growth = saves+views change vs the previous equal period. Null when the base is too small. */
export function cuisineGrowth(experiences: TrendExperience[]) {
  const by = new Map<string, { now: number; prev: number }>();
  for (const e of experiences) {
    const g = by.get(e.cuisine) ?? { now: 0, prev: 0 };
    g.now += e.views;
    g.prev += e.viewsPrev;
    by.set(e.cuisine, g);
  }
  return new Map(
    Array.from(by.entries()).map(([k, v]) => [k, v.prev >= MIN_SAMPLE_VIEWS ? (v.now - v.prev) / v.prev : null]),
  );
}

export type Insight = {
  id: string;
  title: string;
  metric: string;
  status: "insight" | "insufficient";
};

const pct = (n: number) => `${Math.round(n * 100)}%`;

/** Rule-based insights. Each explains the metric behind it; small samples yield a notice instead. */
export function generateInsights(input: {
  byWeekday: Group[];
  byCuisine: Group[];
  byPriceBand: Group[];
  byCategory: Group[];
  labels: { cuisine: (k: string) => string; priceBand: (k: string) => string; category: (k: string) => string };
}): Insight[] {
  const insights: Insight[] = [];

  // 1. Friday vs weekday (Mon–Thu) fill rate.
  const fri = input.byWeekday.find((g) => g.key === "5");
  const weekdayGroups = input.byWeekday.filter((g) => ["1", "2", "3", "4"].includes(g.key));
  const wk = weekdayGroups.reduce(
    (a, g) => ({ offered: a.offered + g.seatsOffered, filled: a.filled + g.seatsFilled, sessions: a.sessions + g.sessions }),
    { offered: 0, filled: 0, sessions: 0 },
  );
  if (fri && fri.enough && fri.fillRate !== null && wk.offered >= MIN_SAMPLE_SEATS && wk.sessions >= MIN_SAMPLE_SESSIONS) {
    const wkRate = wk.filled / wk.offered;
    const diff = fri.fillRate - wkRate;
    insights.push({
      id: "friday-vs-weekday",
      title:
        Math.abs(diff) < 0.05
          ? "Friday and weekday sessions are filling at similar rates."
          : diff > 0
            ? "Friday sessions are filling faster than weekday sessions."
            : "Weekday sessions are filling faster than Friday sessions.",
      metric: `Seats filled ÷ seats offered: Friday ${pct(fri.fillRate)} (${fri.sessions} sessions, ${fri.seatsOffered} seats) vs Mon–Thu ${pct(wkRate)} (${wk.sessions} sessions, ${wk.offered} seats).`,
      status: "insight",
    });
  } else {
    insights.push({
      id: "friday-vs-weekday",
      title: "Not enough data to compare Friday and weekday demand yet.",
      metric: `Needs at least ${MIN_SAMPLE_SESSIONS} sessions and ${MIN_SAMPLE_SEATS} seats offered in each group.`,
      status: "insufficient",
    });
  }

  // 2. Cuisine with the highest view-to-booking conversion.
  const convCuisines = input.byCuisine.filter((g) => g.conversion !== null && g.bookings >= 5);
  if (convCuisines.length >= 2) {
    const best = [...convCuisines].sort((a, b) => b.conversion! - a.conversion!)[0];
    const avg = convCuisines.reduce((s, g) => s + g.bookings, 0) / convCuisines.reduce((s, g) => s + g.views, 0);
    insights.push({
      id: "cuisine-conversion",
      title: `${input.labels.cuisine(best.key)} experiences have the highest booking conversion.`,
      metric: `Bookings ÷ listing views: ${pct(best.conversion!)} (${best.bookings} bookings from ${best.views} views) vs ${pct(avg)} across cuisines with enough data.`,
      status: "insight",
    });
  } else {
    insights.push({
      id: "cuisine-conversion",
      title: "Not enough data to compare cuisine conversion yet.",
      metric: `Needs at least two cuisines with ${MIN_SAMPLE_VIEWS}+ views and 5+ bookings each.`,
      status: "insufficient",
    });
  }

  // 3. Price band with strongest fill rate.
  const bands = input.byPriceBand.filter((g) => g.enough && g.fillRate !== null);
  if (bands.length >= 2) {
    const sorted = [...bands].sort((a, b) => b.fillRate! - a.fillRate!);
    insights.push({
      id: "price-band",
      title: `Tickets priced ${input.labels.priceBand(sorted[0].key)} are associated with the strongest demand.`,
      metric: `Fill rate ${pct(sorted[0].fillRate!)} across ${sorted[0].sessions} sessions, vs ${pct(sorted[sorted.length - 1].fillRate!)} for ${input.labels.priceBand(sorted[sorted.length - 1].key)}. This is an association in sample data, not a causal price effect.`,
      status: "insight",
    });
  } else {
    insights.push({
      id: "price-band",
      title: "Not enough data to compare price ranges yet.",
      metric: `Needs at least two price ranges with ${MIN_SAMPLE_SESSIONS}+ sessions and ${MIN_SAMPLE_SEATS}+ seats.`,
      status: "insufficient",
    });
  }

  // 4. Category with the highest fill rate.
  const cats = input.byCategory.filter((g) => g.enough && g.fillRate !== null);
  if (cats.length >= 2) {
    const best = [...cats].sort((a, b) => b.fillRate! - a.fillRate!)[0];
    insights.push({
      id: "category-fill",
      title: `${input.labels.category(best.key)} have the highest fill rate.`,
      metric: `${pct(best.fillRate!)} of ${best.seatsOffered} seats filled across ${best.sessions} sessions.`,
      status: "insight",
    });
  }
  return insights;
}
