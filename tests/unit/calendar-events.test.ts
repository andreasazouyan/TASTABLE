import { describe, expect, it } from "vitest";

import { eventCountsByDay } from "@/lib/calendar/event-counts";
import { nyDateTime } from "@/lib/clock";
import { planUpcoming, UPCOMING_EVENTS } from "../../prisma/seed-upcoming-data";

const session = (iso: string, hour: number, seatsLeft: number, availability: "AVAILABLE" | "SOLD_OUT" | "PAST" | "CANCELLED" = seatsLeft ? "AVAILABLE" : "SOLD_OUT") => ({
  id: `${iso}-${hour}`,
  startsAt: nyDateTime(iso, hour),
  endsAt: nyDateTime(iso, hour + 2),
  capacity: 10,
  seatsLeft,
  priceCents: 5000,
  availability,
});

describe("eventCountsByDay", () => {
  const now = nyDateTime("2026-11-05", 12);
  it("counts experiences per New York day, with how many still have seats", () => {
    const counts = eventCountsByDay(
      [
        { id: "a", sessions: [session("2026-11-05", 19, 4), session("2026-11-06", 19, 0)] },
        { id: "b", sessions: [session("2026-11-05", 20, 0)] },
        // 11:30pm New York is still the 5th, even though it's the 6th in UTC.
        { id: "c", sessions: [{ ...session("2026-11-05", 23, 2), startsAt: nyDateTime("2026-11-05", 23, 30) }] },
      ],
      now,
    );
    expect(counts.get("2026-11-05")).toEqual({ total: 3, available: 2 });
    expect(counts.get("2026-11-06")).toEqual({ total: 1, available: 0 });
  });
  it("leaves out past and cancelled sessions and counts an experience once a day", () => {
    const counts = eventCountsByDay(
      [
        { id: "a", sessions: [session("2026-11-05", 10, 3), session("2026-11-05", 18, 3), session("2026-11-05", 20, 3)] },
        { id: "b", sessions: [session("2026-11-07", 19, 5, "CANCELLED")] },
      ],
      now,
    );
    expect(counts.get("2026-11-05")).toEqual({ total: 1, available: 1 });
    expect(counts.has("2026-11-07")).toBe(false);
  });
});

describe("planUpcoming", () => {
  const existing = { "2026-11-06": 8, "2026-11-07": 7, "2026-11-08": 4, "2026-11-11": 2, "2026-11-12": 4 };
  const plan = planUpcoming("2026-11-05", "2026-11-05 09:10", existing);
  const byDay = new Map<string, number>();
  for (const p of plan) byDay.set(p.date, (byDay.get(p.date) ?? 0) + 1);

  it("gives every one of the next 14 days 3–5 events (busy days get one more) and nothing after", () => {
    for (let d = 5; d <= 18; d++) {
      const date = `2026-11-${String(d).padStart(2, "0")}`;
      const total = (byDay.get(date) ?? 0) + ((existing as Record<string, number>)[date] ?? 0);
      expect(byDay.get(date), date).toBeGreaterThanOrEqual(1);
      expect(total, date).toBeGreaterThanOrEqual(3);
      if (((existing as Record<string, number>)[date] ?? 0) < 3) expect(total, date).toBeLessThanOrEqual(5);
    }
    expect(plan.every((p) => p.date >= "2026-11-05" && p.date <= "2026-11-18")).toBe(true);
  });
  it("uses each event once, never earlier today, one per host per day, with valid availability", () => {
    expect(new Set(plan.map((p) => p.event.slug)).size).toBe(plan.length);
    expect(plan.filter((p) => p.date === "2026-11-05").every((p) => p.time > "10:10")).toBe(true);
    for (const date of byDay.keys()) {
      const hosts = plan.filter((p) => p.date === date).map((p) => p.event.host);
      expect(new Set(hosts).size).toBe(hosts.length);
    }
    for (const p of plan) {
      expect(p.seatsReserved).toBeGreaterThanOrEqual(0);
      expect(p.seatsReserved).toBeLessThanOrEqual(p.event.capacity);
    }
  });
  it("has unique slugs and stays clear of Regina's event", () => {
    expect(new Set(UPCOMING_EVENTS.map((e) => e.slug)).size).toBe(UPCOMING_EVENTS.length);
    expect(UPCOMING_EVENTS.some((e) => /regina/i.test(e.slug + e.title))).toBe(false);
  });
});
