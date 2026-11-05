import { describe, expect, it } from "vitest";

import { serverNow } from "@/lib/clock";
import { db } from "@/lib/db";
import { applyFilters, parseFilters } from "@/lib/discovery/filters";
import { REGINA_SESSION_ID, REGINA_SLUG } from "@/lib/domain/reginas-table";
import { isoDateNY } from "@/lib/format";
import { reginaReservationSchema } from "@/lib/validation/reginas-table";
import { getListingsByIds } from "@/server/queries/listings";
import { cancelBooking } from "@/server/services/bookings";
import { reserveReginasTable, resetReginasTableDemo } from "@/server/services/reginas-table";

const now = serverNow();
const form = (o: Partial<Record<string, string>> = {}) =>
  reginaReservationSchema.parse({ sessionId: REGINA_SESSION_ID, contactName: "Zoe Park", contactEmail: "zoe@example.com", plusOneName: "Sam", mainGuest: "PESTO", mainPlusOne: "MEAT_SAUCE", ...o });
const seats = async () => {
  const s = await db.experienceSession.findUniqueOrThrow({ where: { id: REGINA_SESSION_ID } });
  return s.capacity - s.seatsReserved;
};

describe("Regina's Table demo event", () => {
  it("is seeded once: one session on Nov 19 at 8:30 PM New York time, 15 seats, 6 left, $0", async () => {
    const exp = await db.experience.findUniqueOrThrow({ where: { slug: REGINA_SLUG }, include: { sessions: true, venue: true, host: true, menuSections: { include: { items: true } }, itinerary: true } });
    expect(await db.experience.count({ where: { title: exp.title } })).toBe(1);
    expect(exp.sessions).toHaveLength(1);
    expect(exp.sessions[0].startsAt.toISOString()).toBe("2026-11-20T01:30:00.000Z");
    expect(exp.sessions[0].endsAt.toISOString()).toBe("2026-11-20T04:00:00.000Z");
    expect(exp.ticketPriceCents).toBe(0);
    expect(exp.category).toBe("SUPPER_CLUB_PRIVATE_DINING");
    expect(exp.host.displayName).toBe("Regina");
    expect(exp.host.hostType).toBe("CREATOR_INFLUENCER");
    expect(exp.venue.addressLine).toBe("500 Riverside Drive, Manhattan, NY 10027");
    expect(exp.menuSections.map((s) => s.title)).toEqual(["Starter", "Main", "Dessert"]);
    expect(exp.itinerary.map((s) => s.startOffsetMinutes)).toEqual([0, 30, 120]);
    expect(await seats()).toBe(6);
  });

  it("is found by date, Manhattan, Morningside Heights and Supper Club filters, in date order", async () => {
    const ids = (await db.experience.findMany({ where: { status: "PUBLISHED" }, select: { id: true } })).map((x) => x.id);
    const listings = await getListingsByIds(ids, now);
    const found = (q: Record<string, string>) => applyFilters(listings, parseFilters(q), now).some((m) => m.slug === REGINA_SLUG);
    expect(found({ date: "2026-11-19" })).toBe(true);
    expect(found({ borough: "manhattan" })).toBe(true);
    expect(found({ neighborhood: "morningside-heights" })).toBe(true);
    expect(found({ category: "supper-clubs" })).toBe(true);
    expect(found({ category: "classes" })).toBe(false);
    // Default sort stays chronological: nothing on an earlier date comes after it.
    const all = applyFilters(listings, parseFilters({}), now);
    const i = all.findIndex((m) => m.slug === REGINA_SLUG);
    expect(all.slice(0, i).every((m) => m.matched!.startsAt <= all[i].matched!.startsAt)).toBe(true);
    expect(isoDateNY(all[i].matched!.startsAt)).toBe("2026-11-19");
  });

  it("reserves for 2 with a main each, blocks duplicates, sells out after 3 pairs, and resets to 6", async () => {
    await resetReginasTableDemo(db);
    const b = await reserveReginasTable(db, "gst_zoe", form(), now);
    expect(b.ticketCount).toBe(2);
    expect(b.totalPriceCents).toBe(0);
    expect(b.tickets.map((t) => t.mealChoice).sort()).toEqual(["Pasta with meat sauce", "Vegetarian pesto pasta"]);
    expect(await seats()).toBe(4);

    // Double submission (also concurrent) never books twice.
    await expect(reserveReginasTable(db, "gst_zoe", form(), now)).rejects.toThrow(/already on the guest list/);
    const twice = await Promise.allSettled([reserveReginasTable(db, "gst_jordan", form(), now), reserveReginasTable(db, "gst_jordan", form(), now)]);
    expect(twice.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await seats()).toBe(2);

    await reserveReginasTable(db, "gst_sofia", form({ mainGuest: "MEAT_SAUCE" }), now);
    expect(await seats()).toBe(0);
    await expect(reserveReginasTable(db, "gst_alex", form(), now)).rejects.toThrow(/sold out/);

    // A cancelled demo reservation frees its 2 seats.
    await cancelBooking(db, { bookingId: b.id, actor: "GUEST", guestId: "gst_zoe" }, now);
    expect(await seats()).toBe(2);

    const r = await resetReginasTableDemo(db);
    expect(r).toEqual({ removed: 3, seatsLeft: 6 });
    expect(await seats()).toBe(6);
    expect(await db.booking.count({ where: { sessionId: REGINA_SESSION_ID } })).toBe(5); // seeded guest list kept
  });

  it("rejects a missing main course", () => {
    expect(reginaReservationSchema.safeParse({ sessionId: REGINA_SESSION_ID, contactName: "Zoe", contactEmail: "z@example.com", mainGuest: "PESTO" }).success).toBe(false);
  });
});
