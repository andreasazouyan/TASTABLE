import { describe, expect, it } from "vitest";

import { serverNow } from "@/lib/clock";
import { db } from "@/lib/db";
import { applyFilters, parseFilters } from "@/lib/discovery/filters";
import { REGINA_SESSION_ID, REGINA_SLUG, REGINA_TITLE, reginaBookLabel, reginaPartySize } from "@/lib/domain/reginas-table";
import { isoDateNY } from "@/lib/format";
import { reginaReservationSchema } from "@/lib/validation/reginas-table";
import { getListingsByIds } from "@/server/queries/listings";
import { cancelBooking } from "@/server/services/bookings";
import { reserveReginasTable, resetReginasTableDemo } from "@/server/services/reginas-table";

const now = serverNow();
const form = (mains: string[] = ["PESTO", "MEAT_SAUCE"], o: Record<string, unknown> = {}) =>
  reginaReservationSchema.parse({
    sessionId: REGINA_SESSION_ID,
    contactName: "Zoe Park",
    contactEmail: "zoe@example.com",
    ticketCount: mains.length,
    guestNames: mains.map((_, i) => (i === 1 ? "Sam" : "")),
    mains,
    ...o,
  });
const seats = async () => {
  const s = await db.experienceSession.findUniqueOrThrow({ where: { id: REGINA_SESSION_ID } });
  return s.capacity - s.seatsReserved;
};

describe("Regina's Entrepreneurship Class Supper demo event", () => {
  it("is seeded once: one session on Mon Nov 23 at 8:30 PM New York time, 15 seats, 6 left, $0", async () => {
    const exp = await db.experience.findUniqueOrThrow({ where: { slug: REGINA_SLUG }, include: { sessions: true, venue: true, host: true, menuSections: { include: { items: true } }, itinerary: true } });
    expect(exp.title).toBe(REGINA_TITLE);
    expect(exp.description).toMatch(/^Regina and the Tastable team are excited to invite you/);
    expect(JSON.parse(exp.highlights)).toContain("Only 3 spots available — and you can bring a +1!");
    expect(await db.experience.count({ where: { title: exp.title } })).toBe(1);
    expect(exp.sessions).toHaveLength(1);
    expect(exp.sessions[0].startsAt.toISOString()).toBe("2026-11-24T01:30:00.000Z");
    expect(exp.sessions[0].endsAt.toISOString()).toBe("2026-11-24T04:00:00.000Z");
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
    expect(found({ date: "2026-11-23" })).toBe(true);
    expect(found({ borough: "manhattan" })).toBe(true);
    expect(found({ neighborhood: "morningside-heights" })).toBe(true);
    expect(found({ category: "supper-clubs" })).toBe(true);
    expect(found({ category: "classes" })).toBe(false);
    // Default sort stays chronological: nothing on an earlier date comes after it.
    const all = applyFilters(listings, parseFilters({}), now);
    const i = all.findIndex((m) => m.slug === REGINA_SLUG);
    expect(all.slice(0, i).every((m) => m.matched!.startsAt <= all[i].matched!.startsAt)).toBe(true);
    expect(isoDateNY(all[i].matched!.startsAt)).toBe("2026-11-23");
  });

  it("reserves 1 to the seats left with a main per guest, blocks duplicates, never oversells, and resets to 6", async () => {
    await resetReginasTableDemo(db);
    const one = await reserveReginasTable(db, "gst_zoe", form(["PESTO"]), now);
    expect(one.ticketCount).toBe(1);
    expect(one.totalPriceCents).toBe(0);
    expect(one.tickets.map((t) => t.mealChoice)).toEqual(["Vegetarian pesto pasta"]);
    expect(await seats()).toBe(5);

    // Double submission (also concurrent) never books twice.
    await expect(reserveReginasTable(db, "gst_zoe", form(), now)).rejects.toThrow(/already on the guest list/);
    const three = ["MEAT_SAUCE", "PESTO", "MEAT_SAUCE"];
    const twice = await Promise.allSettled([reserveReginasTable(db, "gst_jordan", form(three), now), reserveReginasTable(db, "gst_jordan", form(three), now)]);
    expect(twice.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const jordan = (twice.find((r) => r.status === "fulfilled") as PromiseFulfilledResult<Awaited<ReturnType<typeof reserveReginasTable>>>).value;
    expect(jordan.tickets.map((t) => t.mealChoice)).toEqual(["Pasta with meat sauce", "Vegetarian pesto pasta", "Pasta with meat sauce"]);
    expect(jordan.tickets[1].attendeeName).toBe("Sam");
    expect(await seats()).toBe(2);

    // Capacity can't be exceeded: 3 seats when 2 are left is refused, 2 fills the table.
    await expect(reserveReginasTable(db, "gst_sofia", form(three), now)).rejects.toThrow(/Only 2 seats are left/);
    expect(await seats()).toBe(2);
    await reserveReginasTable(db, "gst_sofia", form(["MEAT_SAUCE", "PESTO"]), now);
    expect(await seats()).toBe(0);
    await expect(reserveReginasTable(db, "gst_alex", form(["PESTO"]), now)).rejects.toThrow(/sold out/);

    // A cancelled demo reservation frees its seats.
    await cancelBooking(db, { bookingId: jordan.id, actor: "GUEST", guestId: "gst_jordan" }, now);
    expect(await seats()).toBe(3);

    const r = await resetReginasTableDemo(db);
    expect(r).toEqual({ removed: 3, seatsLeft: 6 });
    expect(await seats()).toBe(6);
    expect(await db.booking.count({ where: { sessionId: REGINA_SESSION_ID } })).toBe(5); // seeded guest list kept
  });

  it("needs a main course for every guest", () => {
    const base = { sessionId: REGINA_SESSION_ID, contactName: "Zoe", contactEmail: "z@example.com" };
    expect(reginaReservationSchema.safeParse({ ...base, ticketCount: 2, mains: ["PESTO"] }).success).toBe(false);
    expect(reginaReservationSchema.safeParse({ ...base, ticketCount: 2, mains: ["PESTO", "NOPE"] }).success).toBe(false);
    expect(reginaReservationSchema.safeParse({ ...base, ticketCount: 0, mains: [] }).success).toBe(false);
    expect(reginaReservationSchema.safeParse({ ...base, ticketCount: 1, mains: ["PESTO"] }).success).toBe(true);
  });

  it("labels the button by quantity and keeps the quantity within 1 and the seats left", () => {
    expect(reginaBookLabel(1)).toBe("Reserve 1 seat — Free");
    expect(reginaBookLabel(3)).toBe("Reserve 3 seats — Free");
    expect(reginaPartySize(0, 6, 8)).toBe(1);
    expect(reginaPartySize(9, 6, 8)).toBe(6);
    expect(reginaPartySize("abc", 6, 8)).toBe(1);
    expect(reginaPartySize(4, 6, 8)).toBe(4);
  });
});
