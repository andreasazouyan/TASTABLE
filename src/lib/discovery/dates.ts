import { nyDateTime, nyDayRange } from "@/lib/clock";
import { isoDateNY } from "@/lib/format";

/**
 * Quick date options for Discover's "When" filter. Every option is resolved against the request
 * clock in New York time, so "today" is the New York calendar day even late at night UTC.
 */
export const WHEN_OPTIONS = [
  { key: "today", label: "Today" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "next3", label: "Next 3 Days" },
  { key: "weekend", label: "This Weekend" },
  { key: "custom", label: "Choose Dates" },
] as const;
export type WhenKey = (typeof WHEN_OPTIONS)[number]["key"];
export const WHEN_KEYS = WHEN_OPTIONS.map((o) => o.key) as [WhenKey, ...WhenKey[]];

/** Adds whole calendar days to a YYYY-MM-DD date (rolls months and years correctly). */
export function addIsoDays(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Day of week (0 = Sunday) of a YYYY-MM-DD calendar date. */
export function isoWeekday(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/**
 * The New York calendar days [firstDay, lastDay] (inclusive) a quick option covers.
 * - today / tomorrow: one day
 * - next3: today plus the following two days
 * - weekend: the upcoming Saturday and Sunday; on Saturday that's today and tomorrow, on Sunday just today
 */
export function whenDays(when: Exclude<WhenKey, "custom">, now: Date): { first: string; last: string } {
  const today = isoDateNY(now);
  switch (when) {
    case "today":
      return { first: today, last: today };
    case "tomorrow": {
      const t = addIsoDays(today, 1);
      return { first: t, last: t };
    }
    case "next3":
      return { first: today, last: addIsoDays(today, 2) };
    case "weekend": {
      const dow = isoWeekday(today);
      if (dow === 0) return { first: today, last: today };
      const saturday = addIsoDays(today, 6 - dow);
      return { first: saturday, last: addIsoDays(saturday, 1) };
    }
  }
}

/** [start, end) instants for an inclusive range of New York days. */
export function nyDaysWindow(first: string, last: string) {
  return { start: nyDateTime(first), end: nyDayRange(last).end };
}

/**
 * Resolves the date part of the filters to a time window, or null for "any date".
 * Choose Dates: `from` alone is that single day; `from` + `to` is the range (inclusive).
 * Without `when`, the older `date` / `from` / `to` params keep their meaning (from = onwards).
 */
export function dateWindow(
  f: { when?: WhenKey; date?: string; from?: string; to?: string },
  now: Date,
): { start: Date; end: Date } | null {
  if (f.when && f.when !== "custom") {
    const { first, last } = whenDays(f.when, now);
    return nyDaysWindow(first, last);
  }
  if (f.when === "custom") {
    const first = f.from ?? f.to ?? f.date;
    if (!first) return null;
    const last = f.from && f.to ? (f.to < f.from ? f.from : f.to) : first;
    return nyDaysWindow(first, last);
  }
  if (f.date) return nyDayRange(f.date);
  if (f.from || f.to) {
    const start = f.from ? nyDayRange(f.from).start : now;
    const end = f.to ? nyDayRange(f.to).end : new Date(8640000000000000);
    return { start, end };
  }
  return null;
}
