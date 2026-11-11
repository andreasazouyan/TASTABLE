import "server-only";

import { cache } from "react";

import { availability, seatsLeft } from "@/lib/booking/capacity";
import { sessionUnitPrice } from "@/lib/booking/pricing";
import { db } from "@/lib/db";
import { parseList } from "@/lib/domain/lists";
import type { Listing } from "@/lib/discovery/types";
import { neighborhoodForName } from "@/lib/domain/neighborhoods";
import { getHostRatings } from "@/server/queries/reviews";

const COVER_BY_CATEGORY: Record<string, string> = {
  SUPPER_CLUB_PRIVATE_DINING: "terracotta",
  COOKING_CLASS_WORKSHOP: "sand",
  POPUP_EXCLUSIVE: "burgundy",
  SOCIAL_CULINARY: "olive",
};

const listingInclude = (now: Date) =>
  ({
    host: { select: { id: true, slug: true, displayName: true, hostType: true, verified: true, followerCount: true } },
    featuredDishes: { orderBy: { sortOrder: "asc" }, select: { dishKey: true } },
    venue: true,
    photos: { orderBy: { sortOrder: "asc" }, take: 1 },
    sessions: { where: { startsAt: { gt: now }, status: "SCHEDULED" }, orderBy: { startsAt: "asc" } },
  }) as const;

type Row = Awaited<ReturnType<typeof loadRows>>[number];

async function loadRows(now: Date, where: object = {}) {
  return db.experience.findMany({
    where: { status: "PUBLISHED", ...where },
    include: listingInclude(now),
    orderBy: { publishedAt: "desc" },
  });
}

type Rating = Listing["hostRating"];
const NO_RATING: Rating = { average: null, count: 0, isNew: true };

export function toListing(row: Row, now: Date, views = 0, hostRating: Rating = NO_RATING): Listing {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    category: row.category,
    cuisine: row.cuisine,
    tags: parseList(row.tags),
    dietary: parseList(row.dietaryOptions),
    atmosphere: row.socialAtmosphere,
    format: row.format,
    occasions: parseList(row.occasions),
    featured: row.featured,
    isFictional: row.isFictional,
    publishedAt: row.publishedAt,
    durationMinutes: row.durationMinutes,
    ticketPriceCents: row.ticketPriceCents,
    host: row.host,
    hostRating,
    dishes: row.featuredDishes.map((d) => d.dishKey),
    venue: {
      name: row.venue.name,
      type: row.venue.type,
      // Shown and filtered with the shared NYC names (older spellings resolve to the same neighborhood).
      neighborhood: neighborhoodForName(row.venue.neighborhood)?.name ?? row.venue.neighborhood,
      borough: row.venue.borough,
      lat: row.venue.latitude,
      lng: row.venue.longitude,
      isSecret: row.venue.isSecretLocation,
    },
    photo: row.photos[0] ? { url: row.photos[0].url, alt: row.photos[0].alt } : null,
    coverTheme: COVER_BY_CATEGORY[row.category] ?? "terracotta",
    sessions: row.sessions.map((s) => ({
      id: s.id,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      capacity: s.capacity,
      seatsLeft: seatsLeft(s),
      priceCents: sessionUnitPrice(s, row),
      availability: availability(s, now),
    })),
    saves: Math.max(0, row.saveCount),
    views,
  };
}

/** All published listings with upcoming sessions. Cached per request. */
export const getListings = cache(async (nowIso: string): Promise<Listing[]> => {
  const now = new Date(nowIso);
  const since = new Date(now.getTime() - 30 * 86_400_000);
  const [rows, views] = await Promise.all([
    loadRows(now),
    db.experienceDailyStat.groupBy({ by: ["experienceId"], where: { date: { gte: since } }, _sum: { views: true } }),
  ]);
  const viewMap = new Map(views.map((v) => [v.experienceId, v._sum.views ?? 0]));
  const ratings = await getHostRatings(Array.from(new Set(rows.map((r) => r.hostId))));
  return rows.map((r) => toListing(r, now, viewMap.get(r.id) ?? 0, ratings.get(r.hostId)));
});

export async function getListingsByIds(ids: string[], now: Date) {
  const rows = await loadRows(now, { id: { in: ids } });
  const ratings = await getHostRatings(Array.from(new Set(rows.map((r) => r.hostId))));
  return rows.map((r) => toListing(r, now, 0, ratings.get(r.hostId)));
}

export async function getExperienceDetail(slug: string) {
  return db.experience.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      host: { include: { user: { select: { id: true } } } },
      venue: true,
      cancellationPolicy: true,
      photos: { orderBy: { sortOrder: "asc" } },
      sessions: { where: { status: { in: ["SCHEDULED", "CANCELLED"] } }, orderBy: { startsAt: "asc" } },
      menuSections: { orderBy: { sortOrder: "asc" }, include: { items: { orderBy: { sortOrder: "asc" } } } },
      itinerary: { orderBy: { sortOrder: "asc" } },
      _count: { select: { saved: true } },
    },
  });
}

/** The few fields search metadata needs; cheaper than the full detail read. */
export async function getExperienceSeo(slug: string) {
  return db.experience.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: {
      slug: true,
      title: true,
      summary: true,
      host: { select: { displayName: true } },
      venue: { select: { neighborhood: true } },
      photos: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true, alt: true } },
    },
  });
}

export async function getMarketplaceStats() {
  const [experiences, hosts, neighborhoods] = await Promise.all([
    db.experience.count({ where: { status: "PUBLISHED" } }),
    db.hostProfile.count(),
    db.venue.findMany({ distinct: ["neighborhood"], select: { neighborhood: true } }),
  ]);
  return { experiences, hosts, neighborhoods: neighborhoods.length };
}
