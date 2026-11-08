import { describe, expect, it } from "vitest";

import { MIN_BUCKET_SIZE, MIN_SEGMENT_SIZE, safeBuckets, safeCount, segmentAllowed } from "@/lib/analytics/privacy";
import { cancellationFee, computeRefund } from "@/lib/booking/refunds";
import { nyDateTime } from "@/lib/clock";
import { dishLabel, normalizeDish, normalizeDishList } from "@/lib/domain/dishes";
import { itineraryProblems, legacyMenuFromSections, sectionsFromLegacyMenu } from "@/lib/domain/event-content";
import { attendanceFits, onboardingStatus, overlappingSlots, sessionDay, sessionMatchesSlots } from "@/lib/domain/preferences";
import { guestPreferencesPatch } from "@/lib/validation/preferences";
import { ratingLabel, ratingSummary, reviewEligibility, reviewInput, starFills } from "@/lib/reviews";

describe("dish normalization", () => {
  it("keeps catalog keys and maps labels and aliases to them", () => {
    expect(normalizeDish({ key: "pizza" })).toEqual({ dishKey: "pizza", isCustom: false, customName: null });
    expect(normalizeDish({ custom: "  Soup Dumplings! " })?.dishKey).toBe("dumplings");
    expect(normalizeDish({ custom: "Gelato" })?.dishKey).toBe("ice-cream");
    expect(normalizeDish({ custom: "fresh pasta" })?.dishKey).toBe("pasta");
  });
  it("normalizes custom entries so spellings group together", () => {
    const a = normalizeDish({ custom: "Grandma's Piérogi" });
    const b = normalizeDish({ custom: "grandma s  pierogi" });
    expect(a?.isCustom).toBe(true);
    expect(a?.dishKey).toBe("custom:grandma-s-pierogi");
    expect(b?.dishKey).toBe(a?.dishKey);
    expect(a?.customName).toBe("Grandma's Piérogi");
    expect(normalizeDish({ custom: "   " })).toBeNull();
  });
  it("de-duplicates lists and labels keys", () => {
    expect(normalizeDishList([{ key: "pizza" }, { custom: "Pizza" }, { custom: "neapolitan pizza" }]).map((d) => d.dishKey)).toEqual(["pizza"]);
    expect(dishLabel("ice-cream")).toBe("Ice cream");
    expect(dishLabel("custom:smoked-eel")).toBe("Smoked eel");
  });
});

describe("time slots and days", () => {
  const at = (date: string, h: number, m = 0) => nyDateTime(date, h, m);
  it("matches sessions to the two-hour slots they overlap", () => {
    expect(overlappingSlots(at("2026-11-06", 19), at("2026-11-06", 21, 30))).toEqual(["18-20", "20-22"]);
    // Touching edges don't count: 18:00–20:00 is only the dinner slot.
    expect(overlappingSlots(at("2026-11-06", 18), at("2026-11-06", 20))).toEqual(["18-20"]);
  });
  it("handles sessions that run past midnight", () => {
    expect(overlappingSlots(at("2026-11-06", 22, 30), at("2026-11-07", 1))).toEqual(["22-24"]);
    expect(sessionMatchesSlots(["22-24"], at("2026-11-06", 21), at("2026-11-07", 0, 30))).toBe(true);
  });
  it("treats an empty preference as no opinion and finds the NY weekday", () => {
    expect(sessionMatchesSlots([], at("2026-11-06", 9), at("2026-11-06", 10))).toBe(true);
    expect(sessionDay(at("2026-11-06", 23, 30))).toBe("FRI"); // still Friday in New York
  });
  it("fits attendance to the event atmosphere", () => {
    expect(attendanceFits("SOLO", "MEET_NEW_PEOPLE")).toBe(true);
    expect(attendanceFits("SOLO", "BRING_YOUR_PEOPLE")).toBe(false);
    expect(attendanceFits("FRIENDS_OR_PARTNER", "EITHER_WAY")).toBe(true);
    expect(attendanceFits(null, "BRING_YOUR_PEOPLE")).toBe(true);
  });
});

describe("preference validation and status", () => {
  it("accepts a partial patch and rejects out-of-range answers", () => {
    expect(guestPreferencesPatch.safeParse({ preferredTimes: ["18-20"] }).success).toBe(true);
    expect(guestPreferencesPatch.safeParse({ maxTravelMinutes: 25 }).success).toBe(false);
    expect(guestPreferencesPatch.safeParse({ categories: ["SOCIAL_CULINARY", "POPUP_EXCLUSIVE", "COOKING_CLASS_WORKSHOP", "SUPPER_CLUB_PRIVATE_DINING"] }).success).toBe(false);
    expect(guestPreferencesPatch.safeParse({ attendancePreference: "ALONE" }).success).toBe(false);
    expect(guestPreferencesPatch.safeParse({ unknownField: 1 }).success).toBe(false);
  });
  it("derives onboarding status without inventing answers", () => {
    const base = { onboardingCompletedAt: null, onboardingSkippedAt: null };
    expect(onboardingStatus(null)).toBe("NOT_STARTED");
    expect(onboardingStatus({ ...base, locationKey: "nyc", favoriteCuisines: "" })).toBe("NOT_STARTED");
    expect(onboardingStatus({ ...base, preferredDays: "SAT" })).toBe("IN_PROGRESS");
    expect(onboardingStatus({ ...base, onboardingSkippedAt: new Date() })).toBe("SKIPPED");
    expect(onboardingStatus({ ...base, onboardingCompletedAt: new Date() })).toBe("COMPLETED");
  });
});

describe("privacy thresholds", () => {
  it("suppresses small buckets and small segments", () => {
    const r = safeBuckets([{ key: "pizza", guests: 12 }, { key: "custom:my-secret-dish", guests: 1 }, { key: "sushi", guests: MIN_BUCKET_SIZE }], 40);
    expect(r.buckets.map((b) => b.key)).toEqual(["pizza", "sushi"]);
    expect(r.suppressedOptions).toBe(1);
    expect(r.buckets[0].share).toBeCloseTo(0.3);
    expect(safeCount(MIN_BUCKET_SIZE - 1)).toBeNull();
    expect(segmentAllowed(MIN_SEGMENT_SIZE - 1)).toBe(false);
  });
});

describe("cancellation fee", () => {
  const policy = { name: "Standard", fullRefundHours: 48, partialRefundHours: 24, partialRefundPercent: 50 };
  const booking = { subtotalCents: 20000, serviceFeeCents: 1200 };
  const start = new Date("2026-11-10T23:00:00Z");
  it("is the share of the ticket subtotal kept, excluding the service fee", () => {
    expect(cancellationFee(booking, computeRefund(booking, policy, start, new Date(start.getTime() - 72 * 3_600_000)))).toEqual({ feeCents: 0, feePercent: 0 });
    expect(cancellationFee(booking, computeRefund(booking, policy, start, new Date(start.getTime() - 30 * 3_600_000)))).toEqual({ feeCents: 10000, feePercent: 50 });
    expect(cancellationFee(booking, computeRefund(booking, policy, start, new Date(start.getTime() - 2 * 3_600_000)))).toEqual({ feeCents: 20000, feePercent: 100 });
  });
  it("is zero when the host cancels", () => {
    expect(cancellationFee(booking, computeRefund(booking, policy, start, start, "HOST"))).toEqual({ feeCents: 0, feePercent: 0 });
  });
});

describe("reviews", () => {
  const now = new Date("2026-11-03T12:00:00Z");
  const ended = { endsAt: new Date("2026-11-01T02:00:00Z") };
  const checkedIn = [{ status: "CHECKED_IN" }];
  it("only allows ended, non-cancelled, checked-in bookings without a review", () => {
    expect(reviewEligibility({ status: "COMPLETED", session: ended, tickets: checkedIn }, now)).toEqual({ eligible: true, verified: true });
    expect(reviewEligibility({ status: "CANCELLED", session: ended, tickets: checkedIn }, now)).toMatchObject({ reason: "CANCELLED" });
    expect(reviewEligibility({ status: "CONFIRMED", session: { endsAt: new Date("2026-11-05T00:00:00Z") }, tickets: checkedIn }, now)).toMatchObject({ reason: "NOT_ENDED" });
    expect(reviewEligibility({ status: "CONFIRMED", session: ended, tickets: [{ status: "VALID" }] }, now)).toMatchObject({ reason: "NOT_VERIFIED" });
    expect(reviewEligibility({ status: "COMPLETED", session: ended, tickets: checkedIn, review: { id: "r" } }, now)).toMatchObject({ reason: "ALREADY_REVIEWED" });
  });
  it("validates ratings 1–5 and optional aspects", () => {
    expect(reviewInput.safeParse({ rating: 6, body: "Lovely evening overall." }).success).toBe(false);
    expect(reviewInput.parse({ rating: "4", body: "Lovely evening overall.", foodRating: "" }).foodRating).toBeNull();
  });
  it("has one rating calculation with partial stars and a new-host state", () => {
    const s = ratingSummary([5, 5, 4, 4, 5, 4]);
    expect(s.average).toBe(4.5);
    expect(ratingLabel(s)).toBe("4.5 (6 reviews)");
    expect(starFills(4.5)).toEqual([1, 1, 1, 1, 0.5]);
    expect(ratingLabel(ratingSummary([]))).toBe("New host");
    expect(starFills(null)).toEqual([0, 0, 0, 0, 0]);
  });
});

describe("structured event content", () => {
  it("round-trips the legacy flat menu", () => {
    const sections = sectionsFromLegacyMenu([{ title: "Make the dough", description: "Flour and eggs" }]);
    expect(sections).toEqual([{ title: "Menu", description: "", items: [{ name: "Make the dough", description: "Flour and eggs", dietaryTags: [] }] }]);
    expect(legacyMenuFromSections(sections)).toEqual([{ title: "Make the dough", description: "Flour and eggs" }]);
    expect(legacyMenuFromSections([{ title: "Starter", description: "", items: [{ name: "Burrata", description: "", dietaryTags: [] }] }])).toEqual([{ title: "Starter: Burrata", description: "" }]);
  });
  it("validates itinerary chronology", () => {
    const step = (start: number, end: number | null, title = "Step") => ({ startOffsetMinutes: start, endOffsetMinutes: end, title, description: "" });
    expect(itineraryProblems([step(0, 30), step(30, 150), step(150, null)], 180)).toEqual([]);
    expect(itineraryProblems([step(0, 60), step(30, 90)])).toHaveLength(1);
    expect(itineraryProblems([step(60, null), step(0, null)])).toHaveLength(1);
    expect(itineraryProblems([step(0, 240)], 180)).toHaveLength(1);
  });
});

describe("onboarding cuisine choices", () => {
  it("keeps 'Open to everything' exclusive", async () => {
    const { toggleCuisine, OPEN_TO_EVERYTHING } = await import("@/lib/domain/preferences");
    expect(toggleCuisine(["italian", "thai"], OPEN_TO_EVERYTHING, true)).toEqual([OPEN_TO_EVERYTHING]);
    expect(toggleCuisine([OPEN_TO_EVERYTHING], "thai", true)).toEqual(["thai"]);
    expect(guestPreferencesPatch.safeParse({ cuisines: ["any", "thai"] }).success).toBe(false);
    expect(guestPreferencesPatch.safeParse({ cuisines: ["chinese", "vietnamese", "mediterranean"] }).success).toBe(true);
  });
});

describe("seeded event content", () => {
  it("gives every sample event a distinct cover photo and distinct photo set", async () => {
    const { EXPERIENCES } = await import("../../prisma/seed-data");
    const { PHOTOS } = await import("@/lib/domain/photos");
    const covers = EXPERIENCES.map((e) => e.photos[0]);
    expect(new Set(covers).size).toBe(EXPERIENCES.length);
    expect(new Set(EXPERIENCES.map((e) => e.photos.join("|"))).size).toBe(EXPERIENCES.length);
    for (const e of EXPERIENCES) {
      expect(new Set(e.photos).size).toBe(e.photos.length);
      for (const k of e.photos) expect(PHOTOS[k]).toBeDefined();
    }
    expect(new Set(Object.values(PHOTOS).map((p) => p.src)).size).toBe(Object.keys(PHOTOS).length);
  });

  it("has a structured menu for every sample event that passes host validation", async () => {
    const { EXPERIENCES } = await import("../../prisma/seed-data");
    const { SEED_MENUS } = await import("../../prisma/seed-menus");
    const { menuSectionsInput } = await import("@/lib/domain/event-content");
    for (const e of EXPERIENCES) {
      const menu = SEED_MENUS[e.slug];
      expect(menu, e.slug).toBeDefined();
      const parsed = menuSectionsInput.safeParse(menu.sections.map((s) => ({ title: s.title, description: s.description ?? "", items: s.items.map((i) => ({ name: i.name, description: i.description ?? "", dietaryTags: i.dietary ?? [], dish: i.dish })) })));
      expect(parsed.success, e.slug).toBe(true);
    }
  });
});

describe("Tastable event images", () => {
  it("every mapped image file exists, covers are unique, and detail images follow the cover", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const { ALL_EVENT_IMAGE_FILES, EVENT_IMAGES, mappedEventImages: eventImagesFor } = await import("@/lib/domain/event-images");
    for (const f of ALL_EVENT_IMAGE_FILES) expect(fs.existsSync(path.join(process.cwd(), "public/tastable-event-images", f)), f).toBe(true);
    const covers = Object.values(EVENT_IMAGES).map((i) => i.file);
    expect(new Set(covers).size).toBe(covers.length);
    expect(eventImagesFor("italian-pasta-making-workshop").map((p) => p.url)).toEqual([
      "/tastable-event-images/pasta-making-class.jpg",
      "/tastable-event-images/hands-on-cooking-class.jpg",
      "/tastable-event-images/studio-kitchen.jpg",
    ]);
    expect(eventImagesFor("levantine-long-table-dinner")).toEqual([]);
  });
});
