import { describe, expect, it } from "vitest";

import { conceptClock, conceptRequest, eventConcept, generateEventConcept, type DemandContext } from "@/lib/event-concepts/generate";

const b = (key: string, guests: number) => ({ key, guests, share: guests / 40 });
const pizzaCtx: DemandContext = {
  dataSource: "simulated",
  eligibleGuests: 40,
  segment: { allowed: true, guests: 40 },
  topCategories: [b("COOKING_CLASS_WORKSHOP", 22), b("SOCIAL_CULINARY", 18)],
  topCuisines: [b("italian", 20), b("japanese", 12)],
  topDishes: [b("pizza", 24), b("ice-cream", 21), b("ramen", 8)],
  topDays: [b("SAT", 30)],
  topTimes: [b("18-20", 26)],
  topNeighborhoods: [b("east-village", 9)],
  attendance: [b("SOLO", 16), b("DEPENDS", 12)],
  categoryByCuisine: [{ cuisine: "italian", category: "COOKING_CLASS_WORKSHOP", guests: 15 }],
};
const req = (over: Record<string, unknown> = {}) => conceptRequest.parse({ priceMin: 60, priceMax: 110, capacity: 16, ...over });
const clockTimes = (c: ReturnType<typeof generateEventConcept>) => c.itinerary.map((s) => `${conceptClock(c.startTime, s.startOffsetMinutes)} ${s.title}`);

describe("rule-based event concept generator (demo, not a live AI model)", () => {
  it("turns Pizza & Ice Cream demand plus popular Italian cooking classes into a Pizza & Gelato night", () => {
    const c = generateEventConcept(pizzaCtx, req());
    expect(c.source).toBe("rule-based-demo");
    expect(c.title).toBe("Pizza & Gelato Social Night");
    expect(c.category).toBe("COOKING_CLASS_WORKSHOP");
    expect(c.cuisine).toBe("italian");
    expect(c.featuredDishes).toEqual(["pizza", "ice-cream"]);
    expect(c.day).toBe("SAT");
    expect(c.startTime).toBe("18:00");
    expect(clockTimes(c)).toEqual(["6:00 PM Arrival and welcome drinks", "6:30 PM Pizza-making workshop", "8:00 PM Dinner", "9:00 PM Gelato tasting", "10:00 PM End"]);
    expect(c.durationMinutes).toBe(240);
    expect(c.rationale.join(" ")).toContain("Pizza is a requested favorite (24 of 40 guests, 60%)");
    expect(c.rationale.join(" ")).toContain("15 guests who like Italian food also chose Cooking Classes & Workshops");
    expect(() => eventConcept.parse(c)).not.toThrow();
  });

  it("is deterministic, and Regenerate gives a different concept", () => {
    expect(generateEventConcept(pizzaCtx, req())).toEqual(generateEventConcept(pizzaCtx, req()));
    const next = generateEventConcept(pizzaCtx, req({ variant: 1 }));
    expect(next.title).not.toBe("Pizza & Gelato Social Night");
    expect(() => eventConcept.parse(next)).not.toThrow();
  });

  it("adapts to the data instead of always suggesting pizza", () => {
    const ramen: DemandContext = {
      ...pizzaCtx,
      topCategories: [b("SUPPER_CLUB_PRIVATE_DINING", 25)],
      topCuisines: [b("japanese", 22), b("italian", 6)],
      topDishes: [b("ramen", 19), b("dessert", 9)],
      topDays: [b("FRI", 21)],
      topTimes: [b("20-22", 18)],
      attendance: [b("FRIENDS_OR_PARTNER", 20)],
      categoryByCuisine: [],
    };
    const c = generateEventConcept(ramen, req());
    expect(c.cuisine).toBe("japanese");
    expect(c.featuredDishes[0]).toBe("ramen");
    expect(c.category).toBe("SUPPER_CLUB_PRIVATE_DINING");
    expect(c.day).toBe("FRI");
    expect(c.startTime).toBe("20:00");
    expect(c.socialAtmosphere).toBe("BRING_YOUR_PEOPLE");
    expect(c.title).not.toMatch(/Pizza/);
  });

  it("respects host inputs: category, price range, capacity, neighborhood and theme", () => {
    const c = generateEventConcept(pizzaCtx, req({ category: "SUPPER_CLUB_PRIVATE_DINING", priceMin: 40, priceMax: 70, capacity: 10, neighborhood: "astoria", theme: "a Korean barbecue night" }));
    expect(c.category).toBe("SUPPER_CLUB_PRIVATE_DINING");
    expect(c.cuisine).toBe("korean");
    expect(c.featuredDishes).toContain("korean-bbq");
    expect(c.price).toEqual({ min: 40, max: 70, suggested: 70 });
    expect(c.groupSize.max).toBe(10);
    expect(c.summary).toContain("Astoria");
    expect(c.rationale.join(" ")).toContain("Fewer than 5 guests list Astoria");
    expect(c.rationale.join(" ")).toContain("creative direction");
  });

  it("falls back to category defaults when there isn't enough data, and says so", () => {
    const empty: DemandContext = { ...pizzaCtx, segment: { allowed: false, minimum: 10 }, topCategories: [], topCuisines: [], topDishes: [], topDays: [], topTimes: [], attendance: [], topNeighborhoods: [], categoryByCuisine: [] };
    const c = generateEventConcept(empty, req());
    expect(c.rationale.at(-1)).toContain("isn't enough guest preference data");
    expect(() => eventConcept.parse(c)).not.toThrow();
  });

  it("keeps long formats from running past 11 PM and handles split social preferences honestly", () => {
    const late: DemandContext = {
      ...pizzaCtx,
      topCuisines: [b("caribbean", 27)],
      topDishes: [b("jerk-chicken", 24)],
      topTimes: [b("20-22", 33), b("18-20", 32)],
      attendance: [b("DEPENDS", 11), b("FRIENDS_OR_PARTNER", 11), b("SOLO", 11)],
      categoryByCuisine: [],
    };
    const c = generateEventConcept(late, req({ category: "COOKING_CLASS_WORKSHOP" }));
    expect(c.startTime).toBe("18:00");
    expect(c.rationale.join(" ")).toContain("lets a 4-hour event end by 11 PM");
    expect(c.socialAtmosphere).toBe("EITHER_WAY");
    expect(c.rationale.join(" ")).toContain("Guests are split on how they like to attend");
    expect(c.rationale.join(" ")).not.toContain("Most guests");
    // No Caribbean sweet was requested: pair with another Caribbean dish, not a generic dessert.
    expect(c.featuredDishes).toEqual(["jerk-chicken", "doubles"]);
    expect(c.title).toBe("Jerk Chicken & Doubles Social Night");
  });

  it("validates host inputs", () => {
    expect(conceptRequest.safeParse({ priceMin: 90, priceMax: 50, capacity: 10 }).success).toBe(false);
    expect(conceptRequest.safeParse({ priceMin: 50, priceMax: 90, capacity: 1 }).success).toBe(false);
    expect(conceptRequest.safeParse({ priceMin: 50, priceMax: 90, capacity: 10, neighborhood: "atlantis" }).success).toBe(false);
  });
});
