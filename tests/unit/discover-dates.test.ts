import { describe, expect, it } from "vitest";

import { nyDateTime } from "@/lib/clock";
import { addIsoDays, dateWindow, whenDays } from "@/lib/discovery/dates";
import { applyFilters, parseFilters } from "@/lib/discovery/filters";
import type { Listing, ListingSession } from "@/lib/discovery/types";

const at = (iso: string, h = 12, m = 0) => nyDateTime(iso, h, m);

describe("whenDays (America/New_York)", () => {
  it("today and tomorrow use the New York date, not UTC", () => {
    // 11:30pm in New York on Nov 3 is already Nov 4 in UTC.
    const now = at("2026-11-03", 23, 30);
    expect(now.toISOString().slice(0, 10)).toBe("2026-11-04");
    expect(whenDays("today", now)).toEqual({ first: "2026-11-03", last: "2026-11-03" });
    expect(whenDays("tomorrow", now)).toEqual({ first: "2026-11-04", last: "2026-11-04" });
  });

  it("rolls over months and years", () => {
    expect(whenDays("tomorrow", at("2026-11-30"))).toEqual({ first: "2026-12-01", last: "2026-12-01" });
    expect(whenDays("tomorrow", at("2026-12-31"))).toEqual({ first: "2027-01-01", last: "2027-01-01" });
    expect(whenDays("next3", at("2026-12-30"))).toEqual({ first: "2026-12-30", last: "2027-01-01" });
    expect(whenDays("next3", at("2028-02-28"))).toEqual({ first: "2028-02-28", last: "2028-03-01" }); // leap year
    expect(whenDays("next3", at("2027-02-28"))).toEqual({ first: "2027-02-28", last: "2027-03-02" });
    expect(addIsoDays("2026-01-31", 1)).toBe("2026-02-01");
  });

  it("this weekend is the upcoming Saturday and Sunday, including today on a weekend", () => {
    expect(whenDays("weekend", at("2026-11-03"))).toEqual({ first: "2026-11-07", last: "2026-11-08" }); // Tuesday
    expect(whenDays("weekend", at("2026-11-06"))).toEqual({ first: "2026-11-07", last: "2026-11-08" }); // Friday
    expect(whenDays("weekend", at("2026-11-07"))).toEqual({ first: "2026-11-07", last: "2026-11-08" }); // Saturday
    expect(whenDays("weekend", at("2026-11-08"))).toEqual({ first: "2026-11-08", last: "2026-11-08" }); // Sunday
    expect(whenDays("weekend", at("2026-12-29"))).toEqual({ first: "2027-01-02", last: "2027-01-03" }); // across the year
    expect(whenDays("weekend", at("2027-01-31"))).toEqual({ first: "2027-01-31", last: "2027-01-31" }); // Sunday, month end
  });

  it("windows are whole New York days, across DST changes", () => {
    // DST ends 2026-11-01 in New York: that day is 25 hours long.
    const w = dateWindow({ when: "custom", from: "2026-11-01" }, at("2026-10-30"));
    expect(w!.start.toISOString()).toBe("2026-11-01T04:00:00.000Z");
    expect(w!.end.toISOString()).toBe("2026-11-02T05:00:00.000Z");
  });

  it("Choose Dates: one day, a range, and a reversed range", () => {
    const now = at("2026-11-03");
    const one = dateWindow({ when: "custom", from: "2026-11-12" }, now)!;
    expect([one.start, one.end]).toEqual([nyDateTime("2026-11-12"), nyDateTime("2026-11-13")]);
    const range = dateWindow({ when: "custom", from: "2026-12-30", to: "2027-01-02" }, now)!;
    expect([range.start, range.end]).toEqual([nyDateTime("2026-12-30"), nyDateTime("2027-01-03")]);
    const reversed = dateWindow({ when: "custom", from: "2026-11-12", to: "2026-11-10" }, now)!;
    expect([reversed.start, reversed.end]).toEqual([nyDateTime("2026-11-12"), nyDateTime("2026-11-13")]);
    expect(dateWindow({ when: "custom" }, now)).toBeNull();
    // A shared ?date= link (e.g. from the calendar) is that one day.
    expect(dateWindow({ date: "2026-11-12" }, now)).toEqual({ start: nyDateTime("2026-11-12"), end: nyDateTime("2026-11-13") });
  });
});

const session = (id: string, startsAt: Date, priceCents = 5000): ListingSession => ({
  id,
  startsAt,
  endsAt: new Date(+startsAt + 3 * 3600_000),
  capacity: 10,
  seatsLeft: 5,
  priceCents,
  availability: "AVAILABLE",
});

const listing = (slug: string, sessions: ListingSession[], over: Partial<Listing> = {}): Listing =>
  ({
    id: slug,
    slug,
    title: slug,
    summary: "",
    category: "SUPPER_CLUB_PRIVATE_DINING",
    cuisine: "italian",
    format: "SEATED",
    atmosphere: "INTIMATE",
    occasions: [],
    tags: [],
    featured: false,
    publishedAt: null,
    ticketPriceCents: 5000,
    host: { displayName: "Host", hostType: "PRIVATE_CHEF", followerCount: 0 },
    venue: { neighborhood: "SoHo", type: "RESTAURANT", lat: 40.72, lng: -74.0 },
    saves: 0,
    views: 0,
    sessions,
    ...over,
  }) as unknown as Listing;

describe("applyFilters with When", () => {
  const now = at("2026-11-03", 19, 0); // Tuesday 7pm
  const listings = [
    listing("started-today", [session("a", at("2026-11-03", 18, 30))]),
    listing("tonight", [session("b", at("2026-11-03", 20, 0))]),
    listing("tomorrow", [session("c", at("2026-11-04", 19, 0))]),
    listing("thursday", [session("d", at("2026-11-05", 19, 0))]),
    listing("friday", [session("e", at("2026-11-06", 19, 0))]),
    listing("saturday-pricey", [session("f", at("2026-11-07", 19, 0), 15000)], { cuisine: "japanese" }),
    listing("sunday", [session("g", at("2026-11-08", 11, 0))], { cuisine: "japanese" }),
    listing("monday", [session("h", at("2026-11-09", 19, 0))]),
  ];
  const run = (q: Record<string, string>) => applyFilters(listings, parseFilters(q), now).map((l) => l.slug).sort();

  it("never shows sessions that already started", () => {
    expect(run({ when: "today" })).toEqual(["tonight"]);
    expect(run({})).not.toContain("started-today");
  });
  it("tomorrow, next 3 days and this weekend", () => {
    expect(run({ when: "tomorrow" })).toEqual(["tomorrow"]);
    expect(run({ when: "next3" })).toEqual(["thursday", "tomorrow", "tonight"]);
    expect(run({ when: "weekend" })).toEqual(["saturday-pricey", "sunday"]);
  });
  it("Choose Dates", () => {
    expect(run({ when: "custom", from: "2026-11-06" })).toEqual(["friday"]);
    expect(run({ when: "custom", from: "2026-11-06", to: "2026-11-09" })).toEqual(["friday", "monday", "saturday-pricey", "sunday"]);
  });
  it("combines with other filters", () => {
    expect(run({ when: "weekend", cuisine: "japanese", maxPrice: "100" })).toEqual(["sunday"]);
    expect(run({ when: "weekend", collection: "this-weekend" })).toEqual(["saturday-pricey", "sunday"]);
  });
  it("ignores an invalid option", () => {
    expect(parseFilters({ when: "yesterday" }).when).toBeUndefined();
  });
});
