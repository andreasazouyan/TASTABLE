import "server-only";

import { dishLabel } from "@/lib/domain/dishes";
import { sectionsFromLegacyMenu } from "@/lib/domain/event-content";
import { addDays, nyDateTime } from "@/lib/clock";
import { db } from "@/lib/db";
import { parseJson, parseList, menuItemSchema, stringItem } from "@/lib/domain/lists";
import { getNeighborhoodByName } from "@/lib/domain/neighborhoods";
import { isoDateNY } from "@/lib/format";
import type { FinanceBooking, FinanceExpense, FinanceSession } from "@/lib/analytics/finance";
import type { EventInput } from "@/lib/validation/event";

// ─── Events ───────────────────────────────────────────────────────────────────

export async function getHostEvents(hostId: string, now: Date) {
  const rows = await db.experience.findMany({
    where: { hostId },
    orderBy: [{ updatedAt: "desc" }],
    include: {
      photos: { orderBy: { sortOrder: "asc" }, take: 1 },
      venue: { select: { name: true, neighborhood: true, isPlaceholder: true } },
      sessions: { orderBy: { startsAt: "asc" }, select: { id: true, startsAt: true, capacity: true, seatsReserved: true, status: true } },
    },
  });
  return rows.map((e) => {
    const upcoming = e.sessions.filter((s) => s.startsAt > now && s.status === "SCHEDULED");
    return {
      id: e.id,
      slug: e.slug,
      title: e.title,
      status: e.status,
      category: e.category,
      cuisine: e.cuisine,
      priceCents: e.ticketPriceCents,
      photo: e.photos[0]?.url ?? null,
      venue: e.venue,
      isFictional: e.isFictional,
      totalSessions: e.sessions.length,
      upcomingSessions: upcoming.length,
      nextSession: upcoming[0] ?? null,
      upcomingSeats: upcoming.reduce((s, x) => s + x.capacity, 0),
      upcomingSold: upcoming.reduce((s, x) => s + x.seatsReserved, 0),
      updatedAt: e.updatedAt,
    };
  });
}
export type HostEventRow = Awaited<ReturnType<typeof getHostEvents>>[number];

/** Venues a host can pick: ones they manage, and ones already hosting their events. */
export async function getHostVenues(hostId: string) {
  return db.venue.findMany({
    where: { isPlaceholder: false, OR: [{ managedByHostId: hostId }, { experiences: { some: { hostId } } }] },
    orderBy: { name: "asc" },
    select: { id: true, name: true, neighborhood: true, maxCapacity: true, isSecretLocation: true },
  });
}

export async function getPolicyTemplates(hostId: string) {
  return db.cancellationPolicy.findMany({
    where: { OR: [{ hostId: null }, { hostId }] },
    orderBy: [{ hostId: "asc" }, { fullRefundHours: "asc" }],
  });
}

/** Loads an event as wizard input. Returns null when it doesn't exist or isn't this host's. */
export async function getEventForEdit(hostId: string, id: string) {
  const e = await db.experience.findUnique({
    where: { id },
    include: {
      photos: { orderBy: { sortOrder: "asc" } },
      venue: true,
      cancellationPolicy: true,
      sessions: { orderBy: { startsAt: "asc" } },
      menuSections: { orderBy: { sortOrder: "asc" }, include: { items: { orderBy: { sortOrder: "asc" } } } },
      itinerary: { orderBy: { sortOrder: "asc" } },
      featuredDishes: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!e || e.hostId !== hostId) return null;
  const legacyMenu = parseJson(e.menu, menuItemSchema);
  const value: EventInput = {
    title: e.title,
    summary: e.summary,
    description: e.description,
    category: e.category,
    cuisine: e.cuisine as EventInput["cuisine"],
    tags: parseList(e.tags),
    format: e.format,
    occasions: parseList(e.occasions) as EventInput["occasions"],
    socialAtmosphere: e.socialAtmosphere,
    photos: e.photos.map((p) => ({ url: p.url, alt: p.alt })),
    venue: e.venue.isPlaceholder ? { mode: "tbc" } : { mode: "existing", venueId: e.venueId },
    sessions: e.sessions
      .filter((s) => s.status !== "CANCELLED")
      .map((s) => {
        const date = isoDateNY(s.startsAt);
        const time = new Intl.DateTimeFormat("en-GB", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(s.startsAt);
        return { id: s.id, date, time, capacity: s.capacity };
      }),
    ticketPriceDollars: e.ticketPriceCents / 100,
    durationMinutes: e.durationMinutes,
    highlights: parseJson(e.highlights, stringItem),
    menu: legacyMenu,
    menuSections: e.menuSections.length
      ? e.menuSections.map((sec) => ({
          title: sec.title,
          description: sec.description,
          items: sec.items.map((it) => ({
            name: it.name,
            description: it.description,
            dietaryTags: parseList(it.dietaryTags),
            ...(it.dishKey ? { dish: dishLabel(it.dishKey) } : {}),
            ...(it.imageUrl ? { imageUrl: it.imageUrl, imageAlt: it.imageAlt ?? "" } : {}),
          })),
        }))
      : sectionsFromLegacyMenu(legacyMenu),
    menuStatus: e.menuStatus,
    itinerary: e.itinerary.map((st) => ({
      startOffsetMinutes: st.startOffsetMinutes,
      endOffsetMinutes: st.durationMinutes === null ? null : st.startOffsetMinutes + st.durationMinutes,
      title: st.title,
      description: st.description,
    })),
    featuredDishes: e.featuredDishes.map((d) => dishLabel(d.dishKey, d.customName)),
    inclusions: parseJson(e.inclusions, stringItem),
    dietaryOptions: parseList(e.dietaryOptions),
    policy: { mode: "template", templateId: e.cancellationPolicyId },
    intent: "draft",
  };
  const sold = Object.fromEntries(e.sessions.map((s) => [s.id, s.seatsReserved]));
  return { experience: e, value, sold };
}

// ─── Reservations ─────────────────────────────────────────────────────────────

export async function getReservations(hostId: string, now: Date, view: "upcoming" | "past", experienceId?: string) {
  return db.experienceSession.findMany({
    where: {
      experience: { hostId, ...(experienceId ? { id: experienceId } : {}) },
      ...(view === "upcoming" ? { startsAt: { gt: addDays(now, -0.25) } } : { startsAt: { lte: now } }),
      bookings: { some: {} },
    },
    orderBy: { startsAt: view === "upcoming" ? "asc" : "desc" },
    take: view === "upcoming" ? 40 : 20,
    include: {
      experience: { select: { id: true, title: true, slug: true } },
      bookings: {
        orderBy: { createdAt: "asc" },
        include: { tickets: { orderBy: { code: "asc" } } },
      },
    },
  });
}
export type ReservationSession = Awaited<ReturnType<typeof getReservations>>[number];

// ─── Finances ─────────────────────────────────────────────────────────────────

export type RangeKey = "7" | "30" | "90" | "custom";

/** Resolves the finance date filter. Ranges are in New York days and end at the end of today. */
export function resolveRange(params: { range?: string; from?: string; to?: string }, now: Date) {
  const today = isoDateNY(now);
  const end = addDays(nyDateTime(today), 1);
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (params.range === "custom" && params.from && params.to && iso.test(params.from) && iso.test(params.to) && params.from <= params.to) {
    return { key: "custom" as RangeKey, from: nyDateTime(params.from), to: addDays(nyDateTime(params.to), 1), fromIso: params.from, toIso: params.to };
  }
  const days = params.range === "7" ? 7 : params.range === "90" ? 90 : 30;
  const from = addDays(end, -days);
  return { key: String(days) as RangeKey, from, to: end, fromIso: isoDateNY(from), toIso: today };
}

export async function getFinanceData(hostId: string, from: Date, to: Date, now: Date) {
  const [bookings, expenses, sessions, upcomingSessions, events] = await Promise.all([
    db.booking.findMany({
      where: { session: { experience: { hostId } }, createdAt: { gte: from, lt: to } },
      select: { id: true, status: true, ticketCount: true, subtotalCents: true, serviceFeeCents: true, refundAmountCents: true, cancellationFeeCents: true, createdAt: true, sessionId: true },
    }),
    db.eventExpense.findMany({
      where: { hostId, incurredAt: { gte: from, lt: to } },
      orderBy: { incurredAt: "desc" },
      include: { experience: { select: { title: true } }, session: { select: { startsAt: true } } },
    }),
    db.experienceSession.findMany({
      where: { experience: { hostId }, startsAt: { gte: from, lt: to } },
      include: { experience: { select: { title: true } } },
      orderBy: { startsAt: "asc" },
    }),
    db.experienceSession.count({ where: { experience: { hostId }, startsAt: { gt: now }, status: "SCHEDULED" } }),
    db.experience.findMany({
      where: { hostId },
      orderBy: { title: "asc" },
      select: { id: true, title: true, sessions: { orderBy: { startsAt: "desc" }, select: { id: true, startsAt: true } } },
    }),
  ]);

  // Bookings for the sessions in range (by event date), for the per-event table.
  const sessionBookings = await db.booking.findMany({
    where: { sessionId: { in: sessions.map((s) => s.id) } },
    select: { id: true, status: true, ticketCount: true, subtotalCents: true, serviceFeeCents: true, refundAmountCents: true, cancellationFeeCents: true, createdAt: true, sessionId: true },
  });
  const sessionExpenses = await db.eventExpense.findMany({
    where: { hostId, sessionId: { in: sessions.map((s) => s.id) } },
    select: { amountCents: true, incurredAt: true, category: true, experienceId: true, sessionId: true },
  });

  const financeSessions: FinanceSession[] = sessions.map((s) => ({
    id: s.id,
    experienceId: s.experienceId,
    experienceTitle: s.experience.title,
    startsAt: s.startsAt,
    capacity: s.capacity,
    seatsReserved: s.seatsReserved,
    status: s.status,
  }));
  const financeExpenses: FinanceExpense[] = expenses.map((e) => ({ amountCents: e.amountCents, incurredAt: e.incurredAt, category: e.category, experienceId: e.experienceId, sessionId: e.sessionId }));

  return {
    bookings: bookings as FinanceBooking[],
    expenses,
    financeExpenses,
    sessions: financeSessions,
    sessionBookings: sessionBookings as FinanceBooking[],
    sessionExpenses: sessionExpenses as FinanceExpense[],
    upcomingSessions,
    events,
  };
}

// ─── Overview ─────────────────────────────────────────────────────────────────

export async function getRecentReservations(hostId: string, take = 6) {
  return db.booking.findMany({
    where: { session: { experience: { hostId } } },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      reference: true,
      contactName: true,
      ticketCount: true,
      status: true,
      createdAt: true,
      subtotalCents: true,
      session: { select: { startsAt: true, experience: { select: { title: true } } } },
    },
  });
}

export async function getUpcomingSessions(hostId: string, now: Date, take = 5) {
  return db.experienceSession.findMany({
    where: { experience: { hostId }, startsAt: { gt: now }, status: "SCHEDULED" },
    orderBy: { startsAt: "asc" },
    take,
    include: { experience: { select: { id: true, title: true, status: true } }, _count: { select: { waitlist: { where: { status: "WAITING" } } } } },
  });
}

export async function getVenueRequests(hostId: string) {
  return db.venueAssistanceRequest.findMany({ where: { hostId }, orderBy: { createdAt: "desc" } });
}

// ─── Trends ───────────────────────────────────────────────────────────────────

/** Marketplace-wide (or one host's) raw rows for Culinary Trends, within a window of event dates. */
export async function getTrendRows(now: Date, days: number, scope: { hostId?: string; category?: string; borough?: string }) {
  const from = addDays(now, -days);
  const prevFrom = addDays(from, -days);
  const where = {
    status: { in: ["PUBLISHED", "UNPUBLISHED", "CANCELLED", "ARCHIVED"] as ("PUBLISHED" | "UNPUBLISHED" | "CANCELLED" | "ARCHIVED")[] },
    ...(scope.hostId ? { hostId: scope.hostId } : {}),
    ...(scope.category ? { category: scope.category as never } : {}),
  };
  const exps = await db.experience.findMany({
    where,
    select: {
      id: true,
      title: true,
      cuisine: true,
      category: true,
      ticketPriceCents: true,
      occasions: true,
      venue: { select: { neighborhood: true, borough: true } },
      dailyStats: { where: { date: { gte: prevFrom, lt: now } }, select: { date: true, views: true } },
      _count: { select: { saved: true } },
    },
  });
  const filtered = scope.borough ? exps.filter((e) => e.venue.borough === scope.borough) : exps;
  const ids = filtered.map((e) => e.id);
  const [sessions, bookings] = await Promise.all([
    db.experienceSession.findMany({
      where: { experienceId: { in: ids }, startsAt: { gte: from, lt: addDays(now, days) } },
      select: { experienceId: true, startsAt: true, capacity: true, seatsReserved: true, status: true },
    }),
    db.booking.findMany({
      where: { session: { experienceId: { in: ids } }, createdAt: { gte: from, lt: now } },
      select: { ticketCount: true, status: true, createdAt: true, session: { select: { experienceId: true } } },
    }),
  ]);
  return {
    from,
    experiences: filtered.map((e) => ({
      id: e.id,
      title: e.title,
      cuisine: e.cuisine,
      category: e.category,
      priceCents: e.ticketPriceCents,
      neighborhood: e.venue.neighborhood,
      borough: e.venue.borough || getNeighborhoodByName(e.venue.neighborhood)?.borough || "",
      occasions: parseList(e.occasions),
      views: e.dailyStats.filter((d) => d.date >= from).reduce((s, d) => s + d.views, 0),
      viewsPrev: e.dailyStats.filter((d) => d.date < from).reduce((s, d) => s + d.views, 0),
      saves: e._count.saved,
    })),
    sessions,
    bookings: bookings.map((b) => ({ experienceId: b.session.experienceId, ticketCount: b.ticketCount, status: b.status, createdAt: b.createdAt })),
  };
}

/** Guest preferences (for the occasion × cuisine section). Aggregate counts only, never individuals. */
export async function getPreferenceCounts() {
  const prefs = await db.guestPreferences.findMany({ select: { favoriteCuisines: true, motivations: true } });
  return prefs.map((p) => ({ cuisines: parseList(p.favoriteCuisines), motivations: parseList(p.motivations) }));
}
