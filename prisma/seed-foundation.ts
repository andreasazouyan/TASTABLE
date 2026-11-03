/**
 * Demo data for the unified data model (featured dishes, structured menus, itineraries, richer
 * guest preferences, verified reviews). Runs at the END of the seed and uses no randomness, so
 * the rest of the deterministic seed is unchanged. Everything here is FICTIONAL demo content.
 */
import type { PrismaClient } from "../src/generated/prisma/client";
import { normalizeDishList } from "../src/lib/domain/dishes";
import { sectionsFromLegacyMenu } from "../src/lib/domain/event-content";
import { DAYS, overlappingSlots } from "../src/lib/domain/preferences";
import { NEIGHBORHOODS } from "../src/lib/domain/neighborhoods";
import { nyWeekdayHour } from "../src/lib/clock";
import { recomputeSaveCounts } from "../src/server/services/saved";

/** Dishes each seeded experience features (catalog keys). */
export const FEATURED_DISHES: Record<string, string[]> = {
  "brooklyn-japanese-chefs-table": ["omakase", "sushi"],
  "italian-pasta-making-workshop": ["pasta", "tiramisu"],
  "harlem-art-gallery-dinner": ["jollof-rice", "suya"],
  "rooftop-creator-supper-club": ["biryani", "curry"],
  "international-newcomers-social-dinner": ["dumplings", "mezze"],
  "french-pastry-workshop": ["croissant", "pastries"],
  "korean-fermentation-workshop": ["kimchi", "bibimbap"],
  "secret-location-tasting-dinner": ["tasting-menu", "oysters"],
  "red-hook-fire-cookout": ["jerk-chicken", "oxtail"],
  "levantine-mezze-workshop": ["mezze", "hummus"],
  "levantine-long-table-dinner": ["shawarma", "mezze"],
  "greenhouse-plant-based-supper": ["plant-based-tasting", "grain-bowl"],
  "wine-and-cheese-social": ["cheese-board"],
  "dumbo-dumpling-class": ["dumplings", "gyoza"],
  "harlem-brunch-supper-club": ["brunch-plates", "jollof-rice"],
  "east-village-taco-pop-up": ["tacos", "mole"],
  "sake-and-small-plates-tasting": ["sushi", "gyoza"],
  "bread-and-butter-workshop": ["croissant", "pastries"],
  "bronx-supper-for-strangers": ["doubles", "jerk-chicken"],
  "soho-loft-chefs-dinner": ["tasting-menu", "steak"],
  "spice-market-walk": ["chaat", "dosa"],
  "cocktail-and-canape-class": ["oysters", "cheese-board"],
  "greenmarket-cooking-class": ["grain-bowl", "plant-based-tasting"],
  "anniversary-tasting-for-two": ["souffle", "steak-frites"],
};

/** A plausible run of show by event format, scaled to the event's duration (minutes from start). */
export function itineraryFor(format: string, duration: number) {
  const at = (fraction: number) => Math.round((duration * fraction) / 15) * 15;
  const steps: { start: number; end: number | null; title: string; description: string }[] =
    format === "HANDS_ON_CLASS"
      ? [
          { start: 0, end: at(0.15), title: "Arrival and welcome drinks", description: "Meet your host and fellow cooks." },
          { start: at(0.15), end: at(0.65), title: "Hands-on cooking", description: "Work at your own station with step-by-step guidance." },
          { start: at(0.65), end: duration, title: "Sit down and eat", description: "Enjoy what you made around a shared table." },
        ]
      : format === "TASTING" || format === "DEMONSTRATION"
        ? [
            { start: 0, end: at(0.2), title: "Welcome", description: "Settle in and meet the host." },
            { start: at(0.2), end: at(0.85), title: format === "TASTING" ? "Guided tasting" : "Live demonstration", description: "Tasting and stories behind each pour and plate." },
            { start: at(0.85), end: duration, title: "Mingle", description: "Questions, notes and one last taste." },
          ]
        : format === "WALKING_TOUR"
          ? [
              { start: 0, end: at(0.1), title: "Meet the group", description: "Meeting point details arrive after booking." },
              { start: at(0.1), end: at(0.9), title: "Market walk and tastings", description: "Stops at shops and stalls along the way." },
              { start: at(0.9), end: duration, title: "Final stop", description: "A sit-down bite to close the walk." },
            ]
          : format === "STANDING_RECEPTION"
            ? [
                { start: 0, end: at(0.25), title: "Doors open", description: "First drinks and snacks." },
                { start: at(0.25), end: at(0.85), title: "Food and drinks all evening", description: "Plates come out from the kitchen throughout." },
                { start: at(0.85), end: duration, title: "Last call", description: "" },
              ]
            : [
                { start: 0, end: at(0.15), title: "Arrival and welcome drinks", description: "" },
                { start: at(0.15), end: at(0.85), title: format === "BRUNCH" ? "Brunch is served" : "Dinner is served", description: "Course by course, with the host introducing each dish." },
                { start: at(0.85), end: duration, title: "Dessert and conversation", description: "" },
              ];
  return steps.map((s, i) => ({ sortOrder: i, startOffsetMinutes: s.start, durationMinutes: s.end === null ? null : s.end - s.start, title: s.title, description: s.description }));
}

/** Simple string hash for deterministic variety without touching the seed's RNG. */
function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h;
}

const REVIEW_TEXT: Record<number, string[]> = {
  5: ["An unforgettable evening. The host made everyone feel welcome and every course landed.", "Worth every dollar. I left with new friends and a full notebook of ideas.", "Beautifully run from start to finish. Already looking for the next date."],
  4: ["Really lovely night. The food was excellent, though it ran a little late.", "Great host and a fun group. One course could have been bigger, but I'd go again."],
  3: ["Good food and a nice space. The pacing felt rushed in the middle."],
};

export async function seedFoundation(db: PrismaClient, now: Date) {
  // ── Event content ──
  const exps = await db.experience.findMany({ select: { id: true, slug: true, format: true, durationMinutes: true, menu: true } });
  for (const e of exps) {
    const dishes = normalizeDishList((FEATURED_DISHES[e.slug] ?? []).map((key) => ({ key })));
    if (dishes.length) await db.experienceDish.createMany({ data: dishes.map((d, i) => ({ experienceId: e.id, dishKey: d.dishKey, sortOrder: i })) });
    const sections = sectionsFromLegacyMenu(JSON.parse(e.menu));
    for (const [i, s] of sections.entries()) {
      await db.experienceMenuSection.create({
        data: { experienceId: e.id, title: s.title, sortOrder: i, items: { create: s.items.map((item, j) => ({ name: item.name, description: item.description, sortOrder: j })) } },
      });
    }
    await db.experienceItineraryStep.createMany({ data: itineraryFor(e.format, e.durationMinutes).map((s) => ({ ...s, experienceId: e.id })) });
  }

  // ── Persona preferences (new questions) ──
  const persona = async (key: string, data: Record<string, unknown>, dishes: string[]) => {
    const prefs = await db.guestPreferences.update({ where: { guestProfileId: `gst_${key}` }, data });
    await db.guestFavoriteDish.createMany({
      data: normalizeDishList(dishes.map((d) => ({ key: d, custom: d }))).map((d, i) => ({ preferencesId: prefs.id, dishKey: d.dishKey, customName: d.customName, isCustom: d.isCustom, sortOrder: i })),
    });
  };
  await persona("jordan", { maxTravelMinutes: 30, preferredDays: "WED,SAT", preferredTimes: "18-20,20-22", attendancePreference: "SOLO" }, ["pasta", "kimchi", "dumplings"]);
  await persona("zoe", { maxTravelMinutes: 20, preferredDays: "FRI,SAT", preferredTimes: "20-22,22-24", attendancePreference: "FRIENDS_OR_PARTNER" }, ["tacos", "ramen", "ice-cream"]);
  await persona("sofia", { maxTravelMinutes: 45, preferredDays: "THU,SAT", preferredTimes: "18-20,20-22", attendancePreference: "DEPENDS" }, ["omakase", "croissant", "Grandmother's pierogi"]);

  // ── Background guests: answers derived from what they booked (deterministic) ──
  const background = await db.guestPreferences.findMany({
    where: { guestProfile: { userId: { startsWith: "usr_bg-" } } },
    select: { id: true, guestProfileId: true },
    orderBy: { guestProfileId: "asc" },
  });
  const ATTEND = ["SOLO", "FRIENDS_OR_PARTNER", "DEPENDS"] as const;
  const TRAVEL = [20, 30, 45] as const;
  for (const [i, p] of background.entries()) {
    const bookings = await db.booking.findMany({
      where: { guestId: p.guestProfileId, status: { not: "CANCELLED" } },
      select: { session: { select: { startsAt: true, endsAt: true, experience: { select: { slug: true } } } } },
    });
    const days = new Map<string, number>();
    const times = new Map<string, number>();
    const dishes = new Map<string, number>();
    for (const b of bookings) {
      const d = DAYS[nyWeekdayHour(b.session.startsAt).weekday].key;
      days.set(d, (days.get(d) ?? 0) + 1);
      for (const t of overlappingSlots(b.session.startsAt, b.session.endsAt)) times.set(t, (times.get(t) ?? 0) + 1);
      for (const k of FEATURED_DISHES[b.session.experience.slug] ?? []) dishes.set(k, (dishes.get(k) ?? 0) + 1);
    }
    const top = (m: Map<string, number>, n: number) => [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n).map(([k]) => k);
    const prefs = await db.guestPreferences.update({
      where: { id: p.id },
      data: {
        locationKey: NEIGHBORHOODS[(i * 7) % NEIGHBORHOODS.length].key,
        maxTravelMinutes: TRAVEL[i % 3],
        attendancePreference: ATTEND[(i * 5) % 3],
        preferredDays: top(days, 2).join(","),
        preferredTimes: top(times, 2).join(","),
      },
    });
    const picked = top(dishes, 3);
    if (picked.length) await db.guestFavoriteDish.createMany({ data: picked.map((dishKey, j) => ({ preferencesId: prefs.id, dishKey, sortOrder: j })) });
  }

  // ── Verified reviews: about one in three attended (checked-in) past bookings of background guests ──
  const attended = await db.booking.findMany({
    where: { status: "COMPLETED", guestId: { startsWith: "gst_bg-" }, tickets: { some: { status: "CHECKED_IN" } }, session: { endsAt: { lte: now } } },
    select: { id: true, guestId: true, sessionId: true, session: { select: { endsAt: true, experience: { select: { id: true, hostId: true } } } } },
    orderBy: { id: "asc" },
  });
  const seen = new Set<string>();
  const reviews = [];
  for (const b of attended) {
    const h = hash(b.id);
    if (h % 3 !== 0 || seen.has(`${b.guestId}:${b.sessionId}`)) continue;
    seen.add(`${b.guestId}:${b.sessionId}`);
    const rating = h % 10 < 6 ? 5 : h % 10 < 9 ? 4 : 3;
    const texts = REVIEW_TEXT[rating];
    reviews.push({
      rating,
      body: texts[h % texts.length],
      foodRating: h % 2 ? rating : null,
      guestId: b.guestId,
      bookingId: b.id,
      sessionId: b.sessionId,
      experienceId: b.session.experience.id,
      hostId: b.session.experience.hostId,
      verifiedAttendance: true,
      isFictional: true,
      createdAt: new Date(b.session.endsAt.getTime() + (1 + (h % 5)) * 86_400_000 > now.getTime() ? now.getTime() : b.session.endsAt.getTime() + (1 + (h % 5)) * 86_400_000),
    });
  }
  await db.review.createMany({ data: reviews });

  await recomputeSaveCounts(db);
  return { featuredDishes: await db.experienceDish.count(), itinerarySteps: await db.experienceItineraryStep.count(), reviews: reviews.length };
}
