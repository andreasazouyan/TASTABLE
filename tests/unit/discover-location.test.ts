import { describe, expect, it } from "vitest";

import { locationMatcher, resolveLocation } from "@/lib/discovery/location";
import { applyFilters, parseFilters } from "@/lib/discovery/filters";
import type { Listing } from "@/lib/discovery/types";
import { BOROUGHS, NEIGHBORHOODS, boroughKeyForName, getNeighborhood, neighborhoodForName, neighborhoodsIn } from "@/lib/domain/neighborhoods";
import { HOSTS, VENUES } from "../../prisma/seed-data";

describe("NYC location vocabulary", () => {
  it("has five boroughs, each with neighborhoods, and no duplicate keys or names", () => {
    expect(BOROUGHS.map((b) => b.name)).toEqual(["Manhattan", "Brooklyn", "Queens", "The Bronx", "Staten Island"]);
    for (const b of BOROUGHS) expect(neighborhoodsIn(b.key).length).toBeGreaterThanOrEqual(15);
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    expect(new Set(NEIGHBORHOODS.map((n) => n.key)).size).toBe(NEIGHBORHOODS.length);
    expect(new Set(NEIGHBORHOODS.map((n) => norm(n.name))).size).toBe(NEIGHBORHOODS.length);
  });

  it("includes the requested Manhattan neighborhoods", () => {
    const names = neighborhoodsIn("manhattan").map((n) => n.name);
    for (const n of ["Financial District", "Battery Park City", "Tribeca", "SoHo", "NoHo", "Nolita", "Chinatown", "Little Italy", "Lower East Side", "East Village", "West Village", "Greenwich Village", "Chelsea", "Meatpacking District", "Flatiron District", "Gramercy", "Union Square", "Kips Bay", "Murray Hill", "Midtown", "Midtown East", "Midtown West", "Hell's Kitchen", "Hudson Yards", "Times Square", "Upper East Side", "Upper West Side", "Lenox Hill", "Yorkville", "Carnegie Hill", "Lincoln Square", "Morningside Heights", "Harlem", "East Harlem", "Hamilton Heights", "Washington Heights", "Inwood"])
      expect(names).toContain(n);
  });

  it("resolves stored names, older spellings and borough names", () => {
    expect(neighborhoodForName("Flatiron")?.key).toBe("flatiron");
    expect(neighborhoodForName("Flatiron District")?.key).toBe("flatiron");
    expect(neighborhoodForName("hells kitchen")?.name).toBe("Hell's Kitchen");
    expect(neighborhoodForName("Bed-Stuy")?.key).toBe("bedford-stuyvesant");
    expect(boroughKeyForName("The Bronx")).toBe("bronx");
    expect(boroughKeyForName("Bronx")).toBe("bronx");
    expect(boroughKeyForName("Staten Island")).toBe("staten-island");
  });

  it("every sample venue and host uses a neighborhood from the shared list", () => {
    for (const v of [...VENUES, ...HOSTS]) expect(getNeighborhood(v.neighborhood), v.neighborhood).toBeDefined();
  });
});

describe("borough and neighborhood matching", () => {
  const soho = { neighborhood: "SoHo", borough: "Manhattan" };
  const harlem = { neighborhood: "Harlem", borough: "Manhattan" };
  const wburg = { neighborhood: "Williamsburg", borough: "Brooklyn" };
  const astoria = { neighborhood: "Astoria", borough: "Queens" };

  it("no selection matches everything", () => {
    expect(locationMatcher([], [])(astoria)).toBe(true);
  });
  it("a borough alone matches the whole borough", () => {
    const m = locationMatcher(["manhattan"], []);
    expect([soho, harlem, wburg].map(m)).toEqual([true, true, false]);
  });
  it("neighborhoods narrow their own borough only", () => {
    const m = locationMatcher(["manhattan", "brooklyn"], ["soho"]);
    expect([soho, harlem, wburg, astoria].map(m)).toEqual([true, false, true, false]);
    expect(resolveLocation(["manhattan", "brooklyn"], ["soho"]).wholeBoroughs).toEqual(new Set(["brooklyn"]));
  });
  it("multiple neighborhoods across boroughs", () => {
    const m = locationMatcher(["manhattan", "brooklyn"], ["soho", "williamsburg"]);
    expect([soho, harlem, wburg, astoria].map(m)).toEqual([true, false, true, false]);
  });
  it("older spellings in stored venues still match", () => {
    expect(locationMatcher([], ["flatiron"])({ neighborhood: "Flatiron", borough: "Manhattan" })).toBe(true);
  });
});

describe("applyFilters with location", () => {
  const now = new Date("2026-11-02T17:00:00Z");
  const mk = (slug: string, neighborhood: string, borough: string, cuisine = "italian") =>
    ({
      id: slug,
      slug,
      title: slug,
      summary: "",
      category: "SUPPER_CLUB_PRIVATE_DINING",
      cuisine,
      format: "SEATED",
      occasions: [],
      tags: [],
      featured: false,
      publishedAt: null,
      host: { displayName: "H", hostType: "PRIVATE_CHEF", followerCount: 0 },
      venue: { neighborhood, borough, type: "LOFT", lat: 40.7, lng: -73.9 },
      saves: 0,
      views: 0,
      sessions: [{ id: slug, startsAt: new Date("2026-11-05T23:00:00Z"), endsAt: new Date("2026-11-06T02:00:00Z"), capacity: 10, seatsLeft: 4, priceCents: 5000, availability: "AVAILABLE" }],
    }) as unknown as Listing;
  const listings = [mk("soho", "SoHo", "Manhattan"), mk("harlem", "Harlem", "Manhattan", "korean"), mk("wburg", "Williamsburg", "Brooklyn"), mk("bronx", "Mott Haven", "The Bronx")];
  const run = (q: Record<string, string>) => applyFilters(listings, parseFilters(q), now).map((l) => l.slug).sort();

  it("filters by borough and neighborhood and combines with other filters", () => {
    expect(run({ borough: "manhattan,bronx" })).toEqual(["bronx", "harlem", "soho"]);
    expect(run({ borough: "manhattan,brooklyn", neighborhood: "harlem" })).toEqual(["harlem", "wburg"]);
    expect(run({ borough: "manhattan", cuisine: "italian" })).toEqual(["soho"]);
    expect(run({ borough: "staten-island" })).toEqual([]);
    expect(parseFilters({ borough: "atlantis,queens", neighborhood: "nowhere" })).toMatchObject({ borough: ["queens"], neighborhood: [] });
  });
});
