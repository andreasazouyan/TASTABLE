import { describe, expect, it } from "vitest";

import { MIN_BUCKET_SIZE } from "@/lib/analytics/privacy";
import { legacyMenuFromSections } from "@/lib/domain/event-content";
import { serverNow } from "@/lib/clock";
import { db } from "@/lib/db";
import { getAudienceInsights, getEventCreationContext } from "@/server/queries/audience-insights";
import { getGuestPreferences } from "@/server/queries/preferences";
import { getHostRatings, getPublicReviews } from "@/server/queries/reviews";
import { cancelBooking } from "@/server/services/bookings";
import { DomainError } from "@/server/services/errors";
import { saveGuestPreferences } from "@/server/services/preferences";
import { createReview, reportReview, updateReview } from "@/server/services/reviews";
import { setSaved, toggleSavedExperience } from "@/server/services/saved";

const now = serverNow();

describe("seeded foundation data", () => {
  it("backfills structured content, policy versions and save counters", async () => {
    const pasta = await db.experience.findUniqueOrThrow({
      where: { slug: "italian-pasta-making-workshop" },
      include: {
        featuredDishes: true,
        itinerary: { orderBy: { sortOrder: "asc" } },
        menuSections: { orderBy: { sortOrder: "asc" }, include: { items: { orderBy: { sortOrder: "asc" } } } },
        _count: { select: { saved: true } },
      },
    });
    expect(pasta.featuredDishes.map((d) => d.dishKey)).toContain("pasta");
    // The legacy flat menu is derived from the structured sections (same rule as saveEvent).
    const sections = pasta.menuSections.map((sec) => ({ title: sec.title, description: sec.description, items: sec.items.map((i) => ({ name: i.name, description: i.description, dietaryTags: [] })) }));
    expect(JSON.parse(pasta.menu)).toEqual(legacyMenuFromSections(sections));
    expect(pasta.menuSections.length).toBeGreaterThan(1);
    expect(pasta.itinerary[0].startOffsetMinutes).toBe(0);
    expect(pasta.saveCount).toBe(pasta._count.saved);
    expect(await db.booking.count({ where: { cancellationPolicyVersion: null } })).toBe(0);
    expect(await db.booking.count({ where: { status: "CANCELLED", cancellationFeeCents: null } })).toBe(0);
  });
});

describe("guest preferences service", () => {
  const guest = "gst_bg-3";

  it("updates only the fields sent and never creates a second row", async () => {
    const before = await getGuestPreferences(guest);
    await saveGuestPreferences(db, guest, { preferredTimes: ["12-14"], favoriteDishes: [{ key: "pizza" }, { custom: "Ice Cream" }, { custom: "Smoked Eel Toast" }] }, now);
    await saveGuestPreferences(db, guest, { locationKey: "astoria" }, now);
    const after = await getGuestPreferences(guest);
    expect(await db.guestPreferences.count({ where: { guestProfileId: guest } })).toBe(1);
    expect(after.preferredTimes).toEqual(["12-14"]);
    expect(after.locationKey).toBe("astoria");
    expect(after.categories).toEqual(before.categories); // untouched
    expect(after.favoriteDishes.map((d) => d.key)).toEqual(["pizza", "ice-cream", "custom:smoked-eel-toast"]);
    expect(after.favoriteDishes[2]).toMatchObject({ label: "Smoked Eel Toast", isCustom: true });
  });

  it("rejects invalid answers on the server", async () => {
    await expect(saveGuestPreferences(db, guest, { maxTravelMinutes: 90 }, now)).rejects.toBeInstanceOf(DomainError);
    await expect(saveGuestPreferences(db, guest, { attendancePreference: "ALONE" }, now)).rejects.toBeInstanceOf(DomainError);
  });

  it("keeps the first completion time", async () => {
    const first = await saveGuestPreferences(db, "gst_alex", { cuisines: ["italian"] }, now, { complete: true });
    const again = await saveGuestPreferences(db, "gst_alex", { cuisines: ["korean"] }, new Date(now.getTime() + 60_000), { complete: true });
    expect(again.onboardingCompletedAt?.getTime()).toBe(first.onboardingCompletedAt?.getTime());
    // Restore Alex as un-onboarded for other tests and demos.
    await db.guestPreferences.update({ where: { guestProfileId: "gst_alex" }, data: { onboardingCompletedAt: null, favoriteCuisines: "" } });
  });
});

describe("unique saves counter", () => {
  it("counts each guest once and never goes negative", async () => {
    const exp = await db.experience.findUniqueOrThrow({ where: { slug: "wine-and-cheese-social" } });
    const guest = "gst_bg-11";
    await setSaved(db, { guestId: guest, experienceId: exp.id, saved: false }, now);
    const base = (await db.experience.findUniqueOrThrow({ where: { id: exp.id } })).saveCount;
    const a = await setSaved(db, { guestId: guest, experienceId: exp.id, saved: true }, now);
    const b = await setSaved(db, { guestId: guest, experienceId: exp.id, saved: true }, now);
    expect(a.saveCount).toBe(base + 1);
    expect(b.saveCount).toBe(base + 1);
    const c = await toggleSavedExperience(db, { guestId: guest, experienceId: exp.id }, now);
    const d = await setSaved(db, { guestId: guest, experienceId: exp.id, saved: false }, now);
    expect(c).toMatchObject({ saved: false, saveCount: base });
    expect(d.saveCount).toBe(base);
    expect(d.saveCount).toBe(await db.savedExperience.count({ where: { experienceId: exp.id } }));
  });
});

describe("cancellation records", () => {
  it("stores the accepted policy version and the fee on cancellation", async () => {
    const booking = await db.booking.findFirstOrThrow({
      where: { status: "CONFIRMED", guestId: { startsWith: "gst_bg-" }, session: { startsAt: { gt: new Date(now.getTime() + 8 * 86_400_000) } } },
      orderBy: { id: "asc" },
    });
    expect(booking.cancellationPolicyVersion).toBe(1);
    const res = await cancelBooking(db, { bookingId: booking.id, actor: "GUEST", guestId: booking.guestId }, now);
    expect(res.booking.cancelledAt).not.toBeNull();
    expect(res.booking.cancellationFeeCents).toBe(booking.subtotalCents - res.booking.refundAmountCents);
    expect(res.booking.cancellationFeePercent).toBe(0);
  });
});

describe("verified reviews", () => {
  async function attendedUnreviewed() {
    return db.booking.findFirstOrThrow({
      where: { status: "COMPLETED", review: null, tickets: { some: { status: "CHECKED_IN" } }, session: { endsAt: { lt: now } }, guestId: { startsWith: "gst_bg-" } },
      include: { session: { include: { experience: true } } },
      orderBy: { id: "asc" },
    });
  }

  it("creates a review with relationships derived from the booking, then allows edits", async () => {
    const b = await attendedUnreviewed();
    const before = (await getHostRatings([b.session.experience.hostId])).get(b.session.experience.hostId)!;
    const review = await createReview(db, { guestId: b.guestId, bookingId: b.id, input: { rating: 1, body: "Not for me, the room was far too loud." } }, now);
    expect(review).toMatchObject({ hostId: b.session.experience.hostId, experienceId: b.session.experience.id, sessionId: b.sessionId, verifiedAttendance: true });
    const after = (await getHostRatings([b.session.experience.hostId])).get(b.session.experience.hostId)!;
    expect(after.count).toBe(before.count + 1);
    await expect(createReview(db, { guestId: b.guestId, bookingId: b.id, input: { rating: 5, body: "Second try at a review." } }, now)).rejects.toThrow(/already reviewed/);
    const edited = await updateReview(db, { guestId: b.guestId, reviewId: review.id, input: { rating: 2, body: "Loud room, but the food was good." } }, now);
    expect(edited.editedAt).not.toBeNull();
  });

  it("refuses cancelled, unverified, future and other guests' bookings", async () => {
    const cancelled = await db.booking.findFirstOrThrow({ where: { status: "CANCELLED", session: { endsAt: { lt: now } } } });
    await expect(createReview(db, { guestId: cancelled.guestId, bookingId: cancelled.id, input: { rating: 5, body: "Should not be allowed." } }, now)).rejects.toThrow(/Cancelled/);
    const future = await db.booking.findFirstOrThrow({ where: { status: "CONFIRMED", session: { startsAt: { gt: now } } } });
    await expect(createReview(db, { guestId: future.guestId, bookingId: future.id, input: { rating: 5, body: "Should not be allowed." } }, now)).rejects.toThrow(/once it has ended/);
    const unverified = await attendedUnreviewed();
    await db.bookingTicket.updateMany({ where: { bookingId: unverified.id }, data: { status: "VALID", checkedInAt: null } });
    await expect(createReview(db, { guestId: unverified.guestId, bookingId: unverified.id, input: { rating: 5, body: "Should not be allowed." } }, now)).rejects.toThrow(/verified/);
    await expect(createReview(db, { guestId: "gst_jordan", bookingId: future.id, input: { rating: 5, body: "Not my booking at all." } }, now)).rejects.toThrow(/not found/i);
  });

  it("reporting keeps the review visible and counted", async () => {
    const review = await db.review.findFirstOrThrow({ where: { status: "PUBLISHED" }, include: { host: true } });
    const reporter = await db.user.findUniqueOrThrow({ where: { id: "usr_jordan" } });
    const before = (await getHostRatings([review.hostId])).get(review.hostId)!;
    await reportReview(db, { reporterUserId: reporter.id, reviewId: review.id, input: { reason: "OFF_TOPIC" } }, now);
    const after = (await getHostRatings([review.hostId])).get(review.hostId)!;
    expect(after.count).toBe(before.count);
    expect((await getPublicReviews({ hostId: review.hostId })).some((r) => r.id === review.id)).toBe(true);
  });
});

describe("audience insights (aggregated, privacy-safe)", () => {
  it("returns only counts above the thresholds and no guest identities", async () => {
    const insights = await getAudienceInsights();
    expect(insights.dataSource).toBe("simulated");
    expect(insights.segment.allowed).toBe(true);
    const json = JSON.stringify(insights);
    expect(json).not.toMatch(/gst_|usr_|@example\.com|Jordan|Zoe|Sofia/);
    for (const list of Object.values(insights.breakdowns!)) for (const b of list.buckets) expect(b.guests).toBeGreaterThanOrEqual(MIN_BUCKET_SIZE);
    // A single guest's custom dish never shows up.
    expect(json).not.toMatch(/custom:/);
  });

  it("moves a guest between buckets on edit instead of double counting", async () => {
    const dishCount = async (key: string) => (await getAudienceInsights()).breakdowns!.dish.buckets.find((b) => b.key === key)?.guests ?? 0;
    const guests = ["gst_bg-20", "gst_bg-21", "gst_bg-22", "gst_bg-23", "gst_bg-24", "gst_bg-25"];
    for (const g of guests) await saveGuestPreferences(db, g, { favoriteDishes: [{ key: "pizza" }, { custom: "gelato" }] }, now);
    const pizza = await dishCount("pizza");
    expect(pizza).toBeGreaterThanOrEqual(guests.length);
    expect(await dishCount("ice-cream")).toBeGreaterThanOrEqual(guests.length);
    for (const g of guests) await saveGuestPreferences(db, g, { favoriteDishes: [{ key: "pizza" }, { custom: "gelato" }] }, now); // edit again
    expect(await dishCount("pizza")).toBe(pizza);
    await saveGuestPreferences(db, guests[0], { favoriteDishes: [{ key: "sushi" }] }, now);
    expect(await dishCount("pizza")).toBe(pizza - 1);
  });

  it("combines filters and suppresses small segments", async () => {
    const all = await getAudienceInsights();
    const narrowed = await getAudienceInsights({ neighborhood: "astoria", day: "SUN", timeSlot: "12-14", cuisine: "korean" });
    expect(narrowed.segment.allowed).toBe(false);
    expect(narrowed.breakdowns).toBeNull();
    expect(JSON.stringify(narrowed)).not.toMatch(/"guests":\d/);
    expect(narrowed.eligibleGuests).toBe(all.eligibleGuests);
    const ctx = await getEventCreationContext();
    expect(ctx.topCuisines.length).toBeGreaterThan(0);
  });
});

describe("profile edits flow into aggregated insights", () => {
  it("changing neighborhood, slot, cuisine and dish moves the guest without double counting", async () => {
    const guests = ["gst_bg-0", "gst_bg-1", "gst_bg-2", "gst_bg-4", "gst_bg-5"];
    const bucket = async (dim: "neighborhood" | "time" | "cuisine" | "dish", key: string) =>
      (await getAudienceInsights()).breakdowns![dim].buckets.find((b) => b.key === key)?.guests ?? 0;
    const before = { hood: await bucket("neighborhood", "upper-west-side"), slot: await bucket("time", "14-16"), thai: await bucket("cuisine", "thai") };
    const eligible = (await getAudienceInsights()).eligibleGuests;
    for (const g of guests) {
      await saveGuestPreferences(db, g, { locationKey: "upper-west-side", preferredTimes: ["14-16"], cuisines: ["thai"], favoriteDishes: [{ key: "pho" }] }, now, { complete: true });
    }
    expect(await bucket("neighborhood", "upper-west-side")).toBe(before.hood + guests.length);
    expect(await bucket("time", "14-16")).toBe(before.slot + guests.length);
    expect(await bucket("cuisine", "thai")).toBe(before.thai + guests.length);
    expect(await bucket("dish", "pho")).toBeGreaterThanOrEqual(guests.length);
    expect((await getAudienceInsights()).eligibleGuests).toBe(eligible);
  });
});
