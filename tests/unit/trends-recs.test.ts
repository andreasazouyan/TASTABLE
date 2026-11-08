import { describe, expect, it } from "vitest";

import { MIN_SAMPLE_SEATS, aggregate, cuisineGrowth, demandHeatmap, generateInsights, type TrendExperience, type TrendSession } from "@/lib/analytics/trends";
import { recommend, type RecCandidate } from "@/lib/recommendations";

const exp = (id: string, over: Partial<TrendExperience> = {}): TrendExperience => ({
  id,
  title: id,
  cuisine: "italian",
  category: "SUPPER_CLUB_PRIVATE_DINING",
  priceCents: 9000,
  neighborhood: "SoHo",
  borough: "Manhattan",
  occasions: [],
  views: 0,
  viewsPrev: 0,
  saves: 0,
  ...over,
});
// Friday 2026-11-06 19:30 NY = 00:30Z next day; Tuesday 2026-11-03 19:30 NY.
const fri = new Date("2026-11-07T00:30:00Z");
const tue = new Date("2026-11-04T00:30:00Z");
const sess = (experienceId: string, startsAt: Date, capacity: number, seatsReserved: number): TrendSession => ({ experienceId, startsAt, capacity, seatsReserved, status: "SCHEDULED" });

describe("culinary trends", () => {
  it("aggregates fill rate and marks small groups as insufficient", () => {
    const groups = aggregate([exp("a"), exp("b", { cuisine: "korean" })], [sess("a", fri, 12, 9), sess("b", fri, 12, 12)], [], (e) => e.cuisine);
    const it = groups.find((g) => g.key === "italian")!;
    expect(it.fillRate).toBe(0.75);
    expect(it.enough).toBe(false); // 1 session, 12 seats: below the sample threshold
  });
  it("produces an insufficient-data notice instead of a claim for small samples", () => {
    const out = generateInsights({
      byWeekday: [],
      byCuisine: [],
      byPriceBand: [],
      byCategory: [],
      labels: { cuisine: (k) => k, priceBand: (k) => k, category: (k) => k },
    });
    expect(out.every((i) => i.status === "insufficient")).toBe(true);
    expect(out[0].metric).toContain(String(MIN_SAMPLE_SEATS));
  });
  it("explains the metric behind a weekday insight", () => {
    const e = [exp("a")];
    const sessions = [...Array.from({ length: 5 }, () => sess("a", fri, 12, 12)), ...Array.from({ length: 5 }, () => sess("a", tue, 12, 6))];
    const byWeekday = aggregate(e, sessions, [], (_x, s) => (s ? String(s.startsAt.getUTCDay() === 6 ? 5 : 2) : []), true);
    const [first] = generateInsights({ byWeekday, byCuisine: [], byPriceBand: [], byCategory: [], labels: { cuisine: String, priceBand: String, category: String } });
    expect(first.status).toBe("insight");
    expect(first.title).toBe("Friday sessions are filling faster than weekday sessions.");
    expect(first.metric).toContain("Friday 100%");
    expect(first.metric).toContain("Mon–Thu 50%");
  });
  it("places sessions in the heatmap by New York weekday and time", () => {
    const rows = demandHeatmap([exp("a")], [sess("a", fri, 10, 5)]);
    const evening = rows.find((r) => r.slot === "Evening")!;
    expect(evening.cells.find((c) => c.day === "Fri")!.fillRate).toBe(0.5);
  });
  it("only reports growth when the previous period has enough views", () => {
    const g = cuisineGrowth([exp("a", { views: 300, viewsPrev: 200 }), exp("b", { cuisine: "korean", views: 50, viewsPrev: 20 })]);
    expect(g.get("italian")).toBe(0.5);
    expect(g.get("korean")).toBeNull();
  });
});

describe("recommendations", () => {
  const c = (slug: string, over: Partial<RecCandidate> = {}): RecCandidate => ({
    id: slug,
    slug,
    category: "SUPPER_CLUB_PRIVATE_DINING",
    cuisine: "french",
    format: "SEATED_DINNER",
    socialAtmosphere: "EITHER_WAY",
    occasions: [],
    hostType: "OTHER",
    isSecretLocation: false,
    venueLat: 40.7233,
    venueLng: -74.003,
    nextStartsAt: new Date("2026-11-10T00:00:00Z"),
    ...over,
  });
  const prefs = { locationKey: "nyc", travelRadiusMiles: null, cuisines: ["japanese"], categories: ["COOKING_CLASS_WORKSHOP"], motivations: ["LEARN"] };

  it("scores transparently and explains every point", () => {
    const [top] = recommend(prefs, [c("class", { category: "COOKING_CLASS_WORKSHOP", cuisine: "japanese" }), c("dinner")]);
    expect(top.item.slug).toBe("class");
    expect(top.score).toBe(3 + 2 + 2);
    expect(top.reasons).toEqual(["Matches your love for Japanese cuisine", "In a category you chose", "Hands-on, and you want to learn new skills"]);
  });
  it("ranks matches first, keeps non-matching items for discovery, and is deterministic", () => {
    const a = recommend(prefs, [c("x"), c("y", { cuisine: "japanese" }), c("z", { cuisine: "japanese" })]);
    expect(a.map((r) => r.item.slug)).toEqual(["y", "z", "x"]);
    expect(a[2]).toMatchObject({ discovery: true, reasons: ["Something different to discover"] });
    expect(recommend(prefs, [c("z", { cuisine: "japanese" }), c("y", { cuisine: "japanese" })]).map((r) => r.item.slug)).toEqual(["y", "z"]);
  });
  it("applies the travel radius as a hard filter", () => {
    const near = { ...prefs, locationKey: "soho", travelRadiusMiles: 2 };
    const far = c("far", { cuisine: "japanese", venueLat: 40.85, venueLng: -73.85 });
    expect(recommend(near, [far])).toEqual([]);
  });

  const at = (iso: string, h: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + (h + 5) * 3_600_000); // New York (EST) hour h
  const sess = (id: string, iso: string, h: number) => ({ id, startsAt: at(iso, h), endsAt: at(iso, h + 2) });
  const guest = { locationKey: "east-village", travelRadiusMiles: null, cuisines: ["italian"], categories: [], motivations: [] };

  it("uses dishes, days and time slots, attendance and neighborhood, with the requested wording", () => {
    const pizza = c("pizza", {
      cuisine: "italian",
      dishes: ["pizza"],
      socialAtmosphere: "BRING_YOUR_PEOPLE",
      venueNeighborhood: "East Village",
      venueLat: 40.7265,
      venueLng: -73.9815,
      // Thursday noon, then Saturday 7pm (2026-11-14 is a Saturday).
      sessions: [sess("s1", "2026-11-12", 12), sess("s2", "2026-11-14", 19)],
    });
    const [top] = recommend({ ...guest, dishes: ["pizza"], days: ["SAT"], timeSlots: ["18-20"], attendance: "FRIENDS_OR_PARTNER" }, [pizza]);
    expect(top.reasons).toEqual([
      "Featuring one of your favorite dishes: Pizza",
      "Matches your love for Italian cuisine",
      "Saturday, 6:00–8:00 PM: when you like to go out",
      "Perfect for a night out with friends",
      "In East Village, your neighborhood",
    ]);
    expect(top.session?.id).toBe("s2"); // the session that fits, not just the soonest
  });

  it("keeps variety: at most two picks per category before others", () => {
    const many = ["a", "b", "c"].map((s) => c(s, { cuisine: "japanese", category: "COOKING_CLASS_WORKSHOP" }));
    const other = c("d", { cuisine: "japanese", category: "SOCIAL_CULINARY" });
    expect(recommend(prefs, [...many, other], 3).map((r) => r.item.slug)).toEqual(["a", "b", "d"]);
  });

  it("never claims a travel time", () => {
    const recs = recommend({ ...guest, maxTravelMinutes: 20 }, [c("x", { cuisine: "italian", venueNeighborhood: "SoHo" })]);
    expect(recs[0].reasons.join(" ")).not.toMatch(/min/);
  });
});
