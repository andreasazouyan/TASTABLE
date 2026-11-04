import { describe, expect, it } from "vitest";

import { demandLabel, leaders, orderedBuckets, parseDemandFilters, peakDayTime, smartInsights, type DemandData } from "@/lib/analytics/demand-insights";
import { safeBuckets } from "@/lib/analytics/privacy";

const SIZE = 40;
const list = (rows: Record<string, number>) => safeBuckets(Object.entries(rows).map(([key, guests]) => ({ key, guests })), SIZE);

function data(over: Partial<DemandData> = {}): DemandData {
  return {
    segment: { allowed: true, guests: SIZE },
    breakdowns: {
      category: list({ COOKING_CLASS_WORKSHOP: 16, SUPPER_CLUB_PRIVATE_DINING: 20, SOCIAL_CULINARY: 8, POPUP_EXCLUSIVE: 3 }),
      cuisine: list({ italian: 14, japanese: 12, any: 30 }),
      dish: list({ pizza: 22, "ice-cream": 19, ramen: 6, "custom:nonna-s-lasagna": 1 }),
      day: list({ SAT: 30, FRI: 25, SUN: 4 }),
      time: list({ "18-20": 26, "20-22": 21 }),
      attendance: list({ FRIENDS_OR_PARTNER: 21, SOLO: 9, DEPENDS: 6 }),
      neighborhood: list({ "east-village": 9, williamsburg: 7, astoria: 2 }),
      travel: list({ "20": 5, "30": 12, "45": 15 }),
    },
    heatmap: [
      { day: "SAT", time: "18-20", guests: 24 },
      { day: "FRI", time: "20-22", guests: 18 },
      { day: "SUN", time: "12-14", guests: null },
    ],
    categoryByCuisine: [
      { cuisine: "italian", category: "COOKING_CLASS_WORKSHOP", guests: 10 },
      { cuisine: "italian", category: "SUPPER_CLUB_PRIVATE_DINING", guests: 6 },
      { cuisine: "japanese", category: "SUPPER_CLUB_PRIVATE_DINING", guests: 7 },
    ],
    bookedByCategory: [
      { category: "SUPPER_CLUB_PRIVATE_DINING", guests: 9 },
      { category: "COOKING_CLASS_WORKSHOP", guests: null },
    ],
    ...over,
  };
}

describe("Culinary Demand Insights: rule-based observations", () => {
  it("names the most requested dish, with its count and share", () => {
    const top = smartInsights(data()).find((i) => i.id === "top-dish")!;
    expect(top.text).toBe("Pizza is the most requested dish among this audience.");
    expect(top.support).toBe("22 of 40 guests (55%) chose it as a favorite dish.");
  });

  it("ranks Pizza and Ice Cream highly when they're frequently selected, and reports ties", () => {
    const d = data();
    expect(d.breakdowns!.dish.buckets.slice(0, 2).map((b) => b.key)).toEqual(["pizza", "ice-cream"]);
    const tied = data({ breakdowns: { ...d.breakdowns!, dish: list({ pizza: 19, "ice-cream": 19 }) } });
    expect(smartInsights(tied).find((i) => i.id === "top-dish")!.text).toBe("Ice cream and Pizza are tied as the most requested dishes among this audience.");
  });

  it("finds the most preferred day and time from the heatmap", () => {
    expect(peakDayTime(data().heatmap)).toMatchObject({ day: "SAT", time: "18-20", guests: 24, ties: 0 });
    const peak = smartInsights(data()).find((i) => i.id === "peak-time")!;
    expect(peak.text).toBe("Saturday evenings (6:00–8:00 PM) are the most preferred time.");
    expect(peak.support).toContain("24 of 40 guests (60%)");
  });

  it("links a category to a cuisine only when that cuisine's fans over-index on it", () => {
    const i = smartInsights(data()).find((x) => x.id === "category-by-cuisine")!;
    expect(i.text).toBe("Cooking classes are popular among guests interested in Italian cuisine.");
    expect(i.support).toBe("10 of 14 Italian fans (71%) chose Cooking Classes & Workshops, compared with 40% of this audience.");
    // Under the cross-group minimum, nothing is said.
    const small = data({ breakdowns: { ...data().breakdowns!, cuisine: list({ italian: 9 }) } });
    expect(smartInsights(small).some((x) => x.id === "category-by-cuisine")).toBe(false);
  });

  it("keeps stated interest and bookings apart, hiding small booking counts", () => {
    const i = smartInsights(data()).find((x) => x.id === "interest-vs-bookings")!;
    expect(i.text).toBe("Supper Clubs & Private Dining draws the most stated interest.");
    expect(i.support).toContain("9 guests in this audience have actually booked one");
    const hidden = data({ bookedByCategory: [{ category: "SUPPER_CLUB_PRIVATE_DINING", guests: null }] });
    expect(smartInsights(hidden).find((x) => x.id === "interest-vs-bookings")!.support).toContain("Fewer than 5");
  });

  it("says nothing when the audience is below the privacy minimum", () => {
    expect(smartInsights(data({ segment: { allowed: false, minimum: 10 }, breakdowns: null }))).toEqual([]);
  });

  it("never surfaces suppressed buckets or one-off custom dishes", () => {
    const d = data();
    expect(d.breakdowns!.dish.buckets.map((b) => b.key)).not.toContain("custom:nonna-s-lasagna");
    expect(d.breakdowns!.dish.suppressedOptions).toBe(1);
    expect(JSON.stringify(smartInsights(d))).not.toMatch(/lasagna|Astoria|POPUP/);
  });
});

describe("filters and labels", () => {
  it("keeps only known values and combines them", () => {
    expect(parseDemandFilters({ neighborhood: "east-village", category: "COOKING_CLASS_WORKSHOP", cuisine: "italian", day: "SAT", time: "18-20" })).toEqual({
      neighborhood: "east-village",
      category: "COOKING_CLASS_WORKSHOP",
      cuisine: "italian",
      day: "SAT",
      timeSlot: "18-20",
    });
    expect(parseDemandFilters({ neighborhood: "atlantis", category: "x", day: "FUNDAY", time: "1-3", cuisine: ["a", "b"] })).toEqual({});
  });

  it("uses the onboarding vocabulary for labels and order", () => {
    expect(demandLabel("time", "22-24")).toBe("10:00 PM–12:00 AM");
    expect(demandLabel("attendance", "DEPENDS")).toBe("A bit of both");
    expect(demandLabel("neighborhood", "east-village")).toBe("East Village");
    expect(demandLabel("cuisine", "global")).toBe("Global");
    expect(orderedBuckets(data().breakdowns!.day, ["SUN", "FRI", "SAT"]).map((x) => x.bucket?.guests ?? null)).toEqual([null, 25, 30]);
    expect(leaders(data().breakdowns!.cuisine, ["any"]).map((b) => b.key)).toEqual(["italian"]);
  });
});
