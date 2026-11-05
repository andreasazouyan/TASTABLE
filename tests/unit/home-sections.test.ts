import { describe, expect, it } from "vitest";

import { areaRow, categoryCounts, featuredRow, popularRow, starterRow, upcomingForHome } from "@/lib/discovery/home-sections";
import type { Listing } from "@/lib/discovery/types";

const NOW = new Date("2026-11-05T15:00:00Z");
const day = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

let seq = 0;
function listing(p: Partial<Listing> & { hood?: string; borough?: string; inDays?: number; seatsLeft?: number } = {}): Listing {
  const id = p.id ?? `l${++seq}`;
  const startsAt = day(p.inDays ?? 2);
  return {
    id,
    slug: p.slug ?? id,
    title: id,
    summary: "",
    category: p.category ?? "SUPPER_CLUB_PRIVATE_DINING",
    cuisine: "global",
    tags: [],
    dietary: [],
    atmosphere: "EITHER_WAY",
    format: "SEATED_DINNER",
    occasions: [],
    featured: p.featured ?? false,
    isFictional: true,
    publishedAt: NOW,
    durationMinutes: 120,
    ticketPriceCents: 5000,
    host: { id: "h", slug: "h", displayName: "H", hostType: "PRIVATE_CHEF", verified: true, followerCount: 100 },
    hostRating: { average: null, count: 0, isNew: true },
    dishes: [],
    venue: { name: "V", type: "LOFT", neighborhood: p.hood ?? "Chelsea", borough: p.borough ?? "Manhattan", lat: 40.74, lng: -74, isSecret: false },
    photo: null,
    coverTheme: "terracotta",
    sessions: [
      {
        id: `${id}-s`,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 7_200_000),
        capacity: 10,
        seatsLeft: p.seatsLeft ?? 5,
        priceCents: 5000,
        availability: (p.seatsLeft ?? 5) === 0 ? "SOLD_OUT" : "AVAILABLE",
      },
    ],
    saves: p.saves ?? 0,
    views: p.views ?? 0,
  };
}

describe("Home sections", () => {
  it("keeps only listings with a bookable upcoming session", () => {
    const up = upcomingForHome([listing({ id: "open" }), listing({ id: "full", seatsLeft: 0 }), listing({ id: "past", inDays: -1 })], NOW);
    expect(up.map((l) => l.id)).toEqual(["open"]);
  });

  it("counts upcoming listings per category", () => {
    const counts = categoryCounts([listing({ category: "SOCIAL_CULINARY" }), listing({ category: "SOCIAL_CULINARY" }), listing()]);
    expect(counts).toMatchObject({ SOCIAL_CULINARY: 2, SUPPER_CLUB_PRIVATE_DINING: 1, COOKING_CLASS_WORKSHOP: 0, POPUP_EXCLUSIVE: 0 });
  });

  it("ranks Popular by saves, most saved first, without duplicates", () => {
    const a = listing({ id: "a", saves: 3 });
    const up = upcomingForHome([a, listing({ id: "b", saves: 9 }), listing({ id: "c", saves: 3, views: 50 }), a], NOW);
    expect(popularRow(up).map((l) => l.id)).toEqual(["b", "c", "a"]);
  });

  it("shows only flagged listings as Featured", () => {
    const up = upcomingForHome([listing({ id: "f", featured: true }), listing({ id: "n" })], NOW);
    expect(featuredRow(up).map((l) => l.id)).toEqual(["f"]);
  });

  it("titles the area row by borough and spreads Manhattan across spotlight neighborhoods first", () => {
    const up = upcomingForHome(
      [
        listing({ id: "chelsea-1", hood: "Chelsea", inDays: 1 }),
        listing({ id: "chelsea-2", hood: "Chelsea", inDays: 2 }),
        listing({ id: "tribeca", hood: "Tribeca", inDays: 1 }),
        listing({ id: "uws", hood: "Upper West Side", inDays: 3 }),
        listing({ id: "bk", hood: "Williamsburg", borough: "Brooklyn" }),
      ],
      NOW,
    );
    const row = areaRow(up, "east-village");
    expect(row.title).toBe("Experiences in Manhattan");
    expect(row.href).toBe("/discover?borough=manhattan");
    expect(row.items.map((l) => l.id)).toEqual(["uws", "chelsea-1", "tribeca", "chelsea-2"]);
  });

  it("falls back to Explore NYC without a location preference", () => {
    const up = upcomingForHome([listing({ id: "m" }), listing({ id: "bk", hood: "Williamsburg", borough: "Brooklyn" })], NOW);
    for (const key of [null, "nyc"]) {
      const row = areaRow(up, key);
      expect(row.title).toBe("Explore NYC");
      expect(row.items.map((l) => l.id)).toEqual(["m", "bk"]);
    }
  });

  it("starter row mixes categories before repeating one", () => {
    const up = upcomingForHome(
      [listing({ id: "s1", saves: 9 }), listing({ id: "s2", saves: 8 }), listing({ id: "c1", category: "COOKING_CLASS_WORKSHOP", saves: 1 })],
      NOW,
    );
    expect(starterRow(up).map((l) => l.id)).toEqual(["s1", "c1", "s2"]);
  });
});
