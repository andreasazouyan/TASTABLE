import { TIME_ZONE } from "@/lib/format";

/**
 * The single server-side clock. Every time-dependent calculation (availability, refunds,
 * "upcoming" vs "past") takes its `now` from here, read once per request or action.
 * Set TASTABLE_FIXED_NOW (ISO string) to freeze time in tests and demos.
 */
export function serverNow(): Date {
  const fixed = process.env.TASTABLE_FIXED_NOW;
  if (fixed) {
    const d = new Date(fixed);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

/** Minutes offset of America/New_York from UTC at the given instant (e.g. -240 in summer). */
function nyOffsetMinutes(at: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** The instant a New York calendar day (YYYY-MM-DD) starts, plus optional hours/minutes. */
export function nyDateTime(isoDate: string, hours = 0, minutes = 0): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, hours, minutes));
  const offset = nyOffsetMinutes(guess);
  const result = new Date(guess.getTime() - offset * 60000);
  // Re-check across DST boundaries.
  const offset2 = nyOffsetMinutes(result);
  return offset2 === offset ? result : new Date(guess.getTime() - offset2 * 60000);
}

/** [start, end) of a New York calendar day. */
export function nyDayRange(isoDate: string) {
  const start = nyDateTime(isoDate);
  const [y, m, d] = isoDate.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  return { start, end: nyDateTime(next) };
}

/** Day of week (0 = Sunday) and hour of a date in New York. */
export function nyWeekdayHour(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, weekday: "short", hour: "numeric", hourCycle: "h23" }).formatToParts(date);
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.find((p) => p.type === "weekday")!.value);
  const hour = Number(parts.find((p) => p.type === "hour")!.value);
  return { weekday, hour };
}

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86_400_000);
}
