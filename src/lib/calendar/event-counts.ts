import { isoDateNY } from "@/lib/format";
import type { Listing } from "@/lib/discovery/types";

/** Experiences on one New York day: all of them, and how many still have seats. */
export type DayEventCount = { total: number; available: number };

/**
 * Counts the public experiences on each New York calendar day, from the same listings Discover
 * uses, so a date's count matches what Discover shows for `?date=` (one per experience per day;
 * sold-out ones count in `total` but not in `available`). Past and cancelled sessions are left out.
 */
export function eventCountsByDay(listings: Pick<Listing, "id" | "sessions">[], now: Date): Map<string, DayEventCount> {
  const days = new Map<string, Map<string, boolean>>();
  for (const l of listings) {
    for (const s of l.sessions) {
      if (s.availability === "PAST" || s.availability === "CANCELLED" || s.startsAt <= now) continue;
      const day = isoDateNY(s.startsAt);
      const perDay = days.get(day) ?? new Map<string, boolean>();
      perDay.set(l.id, (perDay.get(l.id) ?? false) || s.seatsLeft > 0);
      days.set(day, perDay);
    }
  }
  const out = new Map<string, DayEventCount>();
  for (const [day, perDay] of days) out.set(day, { total: perDay.size, available: [...perDay.values()].filter(Boolean).length });
  return out;
}
