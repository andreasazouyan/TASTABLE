import { describe, expect, it } from "vitest";

import { serverNow, addDays } from "@/lib/clock";
import { db } from "@/lib/db";
import { isoDateNY } from "@/lib/format";
import type { EventInput } from "@/lib/validation/event";
import { eventInput } from "@/lib/validation/event";
import { getSharedCalendar } from "@/server/queries/calendar";
import { getListingsByIds } from "@/server/queries/listings";
import { createBooking } from "@/server/services/bookings";
import { assertOwnsExperience, cancelEvent, duplicateEvent, saveEvent, setPublication } from "@/server/services/host-events";

const now = serverNow();
const MAYA = "hst_maya-chen";
const LUCA = "hst_luca-moretti";

async function policyId() {
  return (await db.cancellationPolicy.findFirstOrThrow({ where: { key: "STANDARD_48H", hostId: null } })).id;
}

async function draft(over: Partial<EventInput> = {}): Promise<EventInput> {
  return eventInput.parse({
    title: "Test Ramen Counter",
    summary: "A test ramen counter for the host journey.",
    description: "A fictional test event used by the automated test suite. It exists only in the test database.",
    category: "POPUP_EXCLUSIVE",
    cuisine: "japanese",
    tags: ["ramen"],
    format: "CHEFS_TABLE",
    occasions: ["DATE_NIGHT"],
    socialAtmosphere: "EITHER_WAY",
    photos: [{ url: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624", alt: "A bowl of noodle soup" }],
    venue: { mode: "new", name: "Test Loft", type: "LOFT", neighborhood: "williamsburg", addressLine: "1 Test St", maxCapacity: 20, isSecretLocation: false },
    sessions: [{ date: isoDateNY(addDays(now, 10)), time: "19:00", capacity: 10 }],
    ticketPriceDollars: 75,
    durationMinutes: 120,
    menu: [{ title: "Shoyu ramen", description: "" }],
    policy: { mode: "template", templateId: await policyId() },
    intent: "draft",
    ...over,
  });
}

describe("host events", () => {
  it("saves structured menus, menu status, featured dishes and itinerary; keeps the legacy menu in sync", async () => {
    const menuSections = [
      { title: "Main", description: "", items: [{ name: "Shoyu ramen", description: "Chicken and dashi", dietaryTags: ["dairy-free"] }, { name: "Mushroom ramen", description: "", dietaryTags: ["vegan"], imageUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624", imageAlt: "Ramen" }] },
      { title: "Dessert", description: "", items: [{ name: "Black sesame ice cream", description: "", dietaryTags: ["vegetarian"] }] },
    ];
    const itinerary = [
      { startOffsetMinutes: 0, endOffsetMinutes: 20, title: "Welcome", description: "" },
      { startOffsetMinutes: 20, endOffsetMinutes: 100, title: "Ramen", description: "" },
      { startOffsetMinutes: 100, endOffsetMinutes: null, title: "Dessert", description: "" },
    ];
    const exp = await saveEvent(db, MAYA, await draft({ menuSections, menuStatus: "SUBJECT_TO_CHANGE", itinerary, featuredDishes: ["Ramen", "Ice cream"], intent: "publish" }), now);
    const saved = await db.experience.findUniqueOrThrow({
      where: { id: exp.id },
      include: { menuSections: { orderBy: { sortOrder: "asc" }, include: { items: { orderBy: { sortOrder: "asc" } } } }, itinerary: { orderBy: { sortOrder: "asc" } }, featuredDishes: { orderBy: { sortOrder: "asc" } } },
    });
    expect(saved.menuStatus).toBe("SUBJECT_TO_CHANGE");
    expect(saved.menuSections.map((x) => x.title)).toEqual(["Main", "Dessert"]);
    expect(saved.menuSections[0].items.map((i) => [i.name, i.dietaryTags])).toEqual([["Shoyu ramen", "dairy-free"], ["Mushroom ramen", "vegan"]]);
    expect(saved.menuSections[0].items[1].imageUrl).toContain("unsplash");
    expect(JSON.parse(saved.menu)).toEqual([
      { title: "Main: Shoyu ramen", description: "Chicken and dashi" },
      { title: "Main: Mushroom ramen", description: "" },
      { title: "Dessert: Black sesame ice cream", description: "" },
    ]);
    expect(saved.itinerary.map((x) => [x.startOffsetMinutes, x.durationMinutes])).toEqual([[0, 20], [20, 80], [100, null]]);
    expect(saved.featuredDishes.map((d) => d.dishKey)).toEqual(["ramen", "ice-cream"]);

    // Reordering and removing on edit replaces the content in the new order.
    await saveEvent(db, MAYA, await draft({ menuSections: [menuSections[1], { ...menuSections[0], items: [menuSections[0].items[1]] }], itinerary: itinerary.slice(0, 2) }), now, exp.id);
    const edited = await db.experience.findUniqueOrThrow({ where: { id: exp.id }, include: { menuSections: { orderBy: { sortOrder: "asc" }, include: { items: true } }, itinerary: true } });
    expect(edited.menuSections.map((x) => [x.title, x.items.length])).toEqual([["Dessert", 1], ["Main", 1]]);
    expect(edited.itinerary).toHaveLength(2);
  });

  it("rejects an itinerary out of order and blocks publishing one that runs past the end", async () => {
    await expect(
      draft({ itinerary: [{ startOffsetMinutes: 30, endOffsetMinutes: null, title: "B", description: "" }, { startOffsetMinutes: 0, endOffsetMinutes: null, title: "A", description: "" }] }),
    ).rejects.toThrow(/starts before step 1/);
    await expect(
      saveEvent(db, MAYA, await draft({ itinerary: [{ startOffsetMinutes: 0, endOffsetMinutes: 150, title: "Too long", description: "" }], intent: "publish" }), now),
    ).rejects.toThrow(/runs past the end/);
  });

  it("allows publishing with the menu to be announced", async () => {
    const exp = await saveEvent(db, MAYA, await draft({ menu: [], menuSections: [], menuStatus: "TO_BE_ANNOUNCED", intent: "publish" }), now);
    expect(exp.status).toBe("PUBLISHED");
  });

  it("saves a draft that is not visible in discovery, then publishes it", async () => {
    const exp = await saveEvent(db, MAYA, await draft(), now);
    expect(exp.status).toBe("DRAFT");
    expect(await getListingsByIds([exp.id], now)).toHaveLength(0);

    await setPublication(db, MAYA, exp.id, "PUBLISHED", now);
    const [listing] = await getListingsByIds([exp.id], now);
    expect(listing.title).toBe("Test Ramen Counter");
    expect(listing.sessions[0].seatsLeft).toBe(10);
  });

  it("blocks publishing without a confirmed venue and never invents one", async () => {
    await expect(saveEvent(db, MAYA, await draft({ venue: { mode: "tbc" }, intent: "publish" }), now)).rejects.toThrow(/confirmed venue/);
    const exp = await saveEvent(db, MAYA, await draft({ venue: { mode: "tbc" } }), now);
    const venue = await db.venue.findUniqueOrThrow({ where: { id: exp.venueId } });
    expect(venue.isPlaceholder).toBe(true);
    expect(venue.name).toBe("Venue to be confirmed");
    await expect(setPublication(db, MAYA, exp.id, "PUBLISHED", now)).rejects.toThrow(/confirmed venue/);
  });

  it("only lets the owning host modify an event", async () => {
    const exp = await saveEvent(db, MAYA, await draft({ intent: "publish" }), now);
    await expect(assertOwnsExperience(db, LUCA, exp.id)).rejects.toThrow(/own events/);
    await expect(saveEvent(db, LUCA, await draft({ title: "Hijacked" }), now, exp.id)).rejects.toThrow(/own events/);
    await expect(setPublication(db, LUCA, exp.id, "UNPUBLISHED", now)).rejects.toThrow(/own events/);
    await expect(duplicateEvent(db, LUCA, exp.id, now)).rejects.toThrow(/own events/);
    await expect(cancelEvent(db, LUCA, exp.id, now)).rejects.toThrow(/own events/);
    expect((await db.experience.findUniqueOrThrow({ where: { id: exp.id } })).title).toBe("Test Ramen Counter");
  });

  it("bookings update reservations; capacity can't drop below seats sold; cancel refunds everyone", async () => {
    const input = await draft({ intent: "publish" });
    const exp = await saveEvent(db, MAYA, input, now);
    const session = await db.experienceSession.findFirstOrThrow({ where: { experienceId: exp.id } });
    const booking = await createBooking(
      db,
      { guestId: "gst_jordan", sessionId: session.id, ticketCount: 3, contactName: "Jordan", contactEmail: "j@example.com", acknowledgedPolicy: true },
      now,
    );
    const reservations = await db.booking.findMany({ where: { session: { experience: { hostId: MAYA, id: exp.id } } } });
    expect(reservations.map((r) => r.id)).toContain(booking.id);

    const lowered = { ...input, sessions: [{ ...input.sessions[0], id: session.id, capacity: 2 }] };
    await expect(saveEvent(db, MAYA, lowered, now, exp.id)).rejects.toThrow(/can't be lower than the 3 seats/);

    const { refundedBookings } = await cancelEvent(db, MAYA, exp.id, now);
    expect(refundedBookings).toBe(1);
    const cancelled = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.refundAmountCents).toBe(booking.totalPriceCents);
    expect(await getListingsByIds([exp.id], now)).toHaveLength(0);
  });

  it("duplicates an event as a draft copy", async () => {
    const exp = await saveEvent(db, MAYA, await draft({ intent: "publish" }), now);
    const copy = await duplicateEvent(db, MAYA, exp.id, now);
    expect(copy.status).toBe("DRAFT");
    expect(copy.title).toBe("Test Ramen Counter (copy)");
    expect(await db.experiencePhoto.count({ where: { experienceId: copy.id } })).toBe(1);
  });
});

describe("calendar sharing privacy", () => {
  const TOKEN = "demo-share-jordan-k7Qm2xV9pL4tR8wN3cY6";

  it("shows only explicitly shared, confirmed sessions with no attendee details", async () => {
    const shared = await getSharedCalendar(TOKEN, now);
    expect(shared).not.toBeNull();
    expect(shared!.events.length).toBeGreaterThan(0);
    const json = JSON.stringify(shared);
    expect(json).not.toMatch(/@/); // no emails
    expect(json).not.toMatch(/TBL-/); // no booking references
    expect(json).not.toMatch(/Jordan [A-Z]/); // only the first name of the owner
    for (const e of shared!.events) expect(Object.keys(e).sort()).toEqual(["borough", "endsAt", "neighborhood", "sessionId", "slug", "startsAt", "title"]);

    const pref = await db.calendarSharingPreference.findUniqueOrThrow({ where: { shareToken: TOKEN }, include: { items: true } });
    const sharedIds = new Set(pref.items.map((i) => i.sessionId));
    expect(shared!.events.every((e) => sharedIds.has(e.sessionId))).toBe(true);
    const allConfirmed = await db.booking.count({ where: { guestId: pref.guestProfileId, status: "CONFIRMED", session: { startsAt: { gt: now } } } });
    expect(allConfirmed).toBeGreaterThanOrEqual(shared!.events.length);
  });

  it("rejects guessed or short tokens", async () => {
    expect(await getSharedCalendar("demo-share-jordan", now)).toBeNull();
    expect(await getSharedCalendar("x".repeat(27), now)).toBeNull();
  });

  it("stops working once revoked", async () => {
    const pref = await db.calendarSharingPreference.findUniqueOrThrow({ where: { shareToken: TOKEN } });
    await db.calendarSharingPreference.update({ where: { id: pref.id }, data: { shareToken: null, visibility: "PRIVATE", revokedAt: now } });
    expect(await getSharedCalendar(TOKEN, now)).toBeNull();
  });
});
