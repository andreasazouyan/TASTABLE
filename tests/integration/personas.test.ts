import { describe, expect, it } from "vitest";

import { serverNow } from "@/lib/clock";
import { db } from "@/lib/db";
import { getRecommendations } from "@/server/queries/recommendations";

const now = serverNow();
const prefsOf = async (guestProfileId: string) => db.guestPreferences.findUniqueOrThrow({ where: { guestProfileId } });

describe("audience personas get fitting, explained recommendations", () => {
  it("Zoe (student, under $60) only sees experiences within budget", async () => {
    const recs = await getRecommendations(await prefsOf("gst_zoe"), now, 8);
    expect(recs.length).toBeGreaterThan(0);
    for (const r of recs) {
      expect(r.listing.matched!.priceCents).toBeLessThanOrEqual(6000);
      expect(r.reasons.some((x) => x.includes("within your $60 budget"))).toBe(true);
    }
  });

  it("Jordan (professional, up to $100) is steered to classes and social formats", async () => {
    const recs = await getRecommendations(await prefsOf("gst_jordan"), now, 4);
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.every((r) => r.listing.matched!.priceCents <= 10000)).toBe(true);
    expect(recs[0].reasons.join(" ")).toMatch(/learn new skills|meeting new people/);
  });

  it("Sofia (no budget limit) sees the creator she follows first", async () => {
    const recs = await getRecommendations(await prefsOf("gst_sofia"), now, 4);
    expect(recs[0].listing.host.slug).toBe("priya-raman");
    expect(recs[0].reasons[0]).toBe("Hosted by Priya Raman, whom you follow");
  });
});
