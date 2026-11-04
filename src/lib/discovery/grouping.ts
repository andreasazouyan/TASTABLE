import { addIsoDays } from "@/lib/discovery/dates";
import { isBookable } from "@/lib/booking/capacity";
import { formatDate, isoDateNY } from "@/lib/format";
import { nyDateTime } from "@/lib/clock";
import type { ListingMatch } from "@/lib/discovery/types";

export type DateGroup = { date: string; label: string; items: ListingMatch[] };

/** "Today — November 3", "Tomorrow — November 4", "Thursday, November 5" (year added when it differs). */
export function dayHeading(isoDate: string, now: Date) {
  const today = isoDateNY(now);
  const noon = nyDateTime(isoDate, 12);
  const sameYear = isoDate.slice(0, 4) === today.slice(0, 4);
  const monthDay = formatDate(noon, { month: "long", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) });
  if (isoDate === today) return `Today — ${monthDay}`;
  if (isoDate === addIsoDays(today, 1)) return `Tomorrow — ${monthDay}`;
  return formatDate(noon, { weekday: "long", month: "long", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) });
}

/**
 * Chronological layout: one group per New York calendar day that has a matching session.
 * An experience with sessions on several days appears under each of them, showing that day's
 * session. Within a day, cards are ordered by start time.
 */
export function groupByDate(items: ListingMatch[], now: Date): DateGroup[] {
  const byDay = new Map<string, ListingMatch[]>();
  for (const item of items) {
    const sessions = item.matchedSessions ?? (item.matched ? [item.matched] : []);
    const days = new Map<string, typeof sessions>();
    for (const s of sessions) {
      const day = isoDateNY(s.startsAt);
      days.set(day, [...(days.get(day) ?? []), s]);
    }
    for (const [day, list] of days) {
      const bookable = list.find((s) => isBookable({ ...s, seatsReserved: s.capacity - s.seatsLeft, status: "SCHEDULED" }, now));
      const entry: ListingMatch = { ...item, matched: bookable ?? list[0], matchedCount: list.length, matchedSessions: list };
      byDay.set(day, [...(byDay.get(day) ?? []), entry]);
    }
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, list]) => ({
      date,
      label: dayHeading(date, now),
      items: list.sort((a, b) => a.matched!.startsAt.getTime() - b.matched!.startsAt.getTime() || a.slug.localeCompare(b.slug)),
    }));
}
