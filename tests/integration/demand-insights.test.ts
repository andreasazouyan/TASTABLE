import { describe, expect, it } from "vitest";

import { smartInsights } from "@/lib/analytics/demand-insights";
import { MIN_BUCKET_SIZE } from "@/lib/analytics/privacy";
import { serverNow } from "@/lib/clock";
import { db } from "@/lib/db";
import { getAudienceInsights } from "@/server/queries/audience-insights";
import { saveGuestPreferences } from "@/server/services/preferences";

const now = serverNow();

describe("Culinary Demand Insights against the seeded database", () => {
  it("re-ranks dishes when demo guests switch their favorites to Pizza and Ice Cream", async () => {
    const before = await getAudienceInsights();
    expect(before.breakdowns!.dish.buckets[0].key).not.toBe("pizza");

    const guests = (await db.guestPreferences.findMany({ where: { guestProfileId: { startsWith: "gst_bg-" } }, select: { guestProfileId: true }, orderBy: { guestProfileId: "asc" } })).map(
      (p) => p.guestProfileId,
    );
    expect(guests.length).toBeGreaterThanOrEqual(25);
    // Everyone picks Pizza; all but three also pick Ice Cream (one of them typed "gelato").
    for (const [i, g] of guests.entries()) {
      const dishes = i < 3 ? [{ key: "pizza" }] : i === 3 ? [{ key: "pizza" }, { custom: "Gelato" }] : [{ key: "pizza" }, { key: "ice-cream" }];
      await saveGuestPreferences(db, g, { favoriteDishes: dishes }, now);
    }

    const after = await getAudienceInsights();
    const dishes = after.breakdowns!.dish.buckets;
    expect(dishes.slice(0, 2).map((b) => b.key)).toEqual(["pizza", "ice-cream"]);
    expect(dishes[0].guests).toBeGreaterThanOrEqual(guests.length);
    expect(dishes[1].guests).toBeGreaterThanOrEqual(guests.length - 3); // "Gelato" counted as Ice Cream, once per guest
    expect(dishes.map((b) => b.key)).not.toContain("custom:gelato");
    expect(await db.guestFavoriteDish.count({ where: { preferences: { guestProfileId: guests[3] }, dishKey: "ice-cream" } })).toBe(1);
    expect(smartInsights(after).find((i) => i.id === "top-dish")!.text).toBe("Pizza is the most requested dish among this audience.");
    expect(after.eligibleGuests).toBe(before.eligibleGuests); // edits never add guests

    // Saving the same answers again doesn't double count.
    await saveGuestPreferences(db, guests[10], { favoriteDishes: [{ key: "pizza" }, { key: "ice-cream" }] }, now);
    expect((await getAudienceInsights()).breakdowns!.dish.buckets[0].guests).toBe(dishes[0].guests);
  });

  it("combines filters, keeps interest and bookings separate, and never returns identities", async () => {
    const all = await getAudienceInsights();
    const sat = await getAudienceInsights({ day: "SAT", timeSlot: "18-20" });
    expect(sat.segment.allowed).toBe(true);
    if (!sat.segment.allowed || !all.segment.allowed) throw new Error("expected allowed segments");
    expect(sat.segment.guests).toBeLessThanOrEqual(all.segment.guests);
    for (const b of sat.breakdowns!.day.buckets) expect(b.guests).toBeLessThanOrEqual(sat.segment.guests);
    expect(sat.breakdowns!.day.buckets.find((b) => b.key === "SAT")!.guests).toBe(sat.segment.guests);

    for (const row of all.bookedByCategory ?? []) if (row.guests !== null) expect(row.guests).toBeGreaterThanOrEqual(MIN_BUCKET_SIZE);

    const tiny = await getAudienceInsights({ neighborhood: "astoria", cuisine: "korean", day: "SUN", timeSlot: "12-14" });
    expect(tiny.segment.allowed).toBe(false);
    expect(tiny.bookedByCategory).toBeNull();
    expect(smartInsights(tiny)).toEqual([]);

    const json = JSON.stringify([all, sat, tiny]);
    expect(json).not.toMatch(/gst_|usr_|@example\.com|Jordan|Zoe|Sofia|Alex/);
  });
});
