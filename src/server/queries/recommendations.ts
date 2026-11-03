import "server-only";

import { isBookable } from "@/lib/booking/capacity";
import { parseList } from "@/lib/domain/lists";
import type { Listing, ListingMatch } from "@/lib/discovery/types";
import { rankForGuest, recommend, type RecCandidate, type RecPreferences } from "@/lib/recommendations";
import { db } from "@/lib/db";
import { getListings } from "@/server/queries/listings";

type PrefsRow = {
  guestProfileId?: string;
  locationKey: string;
  travelRadiusMiles: number | null;
  favoriteCuisines: string;
  favoriteCategories: string;
  motivations: string;
  maxBudgetCents?: number | null;
  followedHosts?: string;
  maxTravelMinutes?: number | null;
  preferredDays?: string;
  preferredTimes?: string;
  attendancePreference?: "SOLO" | "FRIENDS_OR_PARTNER" | "DEPENDS" | null;
};

export function toRecPreferences(p: PrefsRow, dishes: string[] = []): RecPreferences {
  return {
    locationKey: p.locationKey,
    travelRadiusMiles: p.travelRadiusMiles,
    cuisines: parseList(p.favoriteCuisines),
    categories: parseList(p.favoriteCategories),
    motivations: parseList(p.motivations),
    maxBudgetCents: p.maxBudgetCents ?? null,
    followedHosts: parseList(p.followedHosts),
    dishes,
    days: parseList(p.preferredDays),
    timeSlots: parseList(p.preferredTimes),
    attendance: p.attendancePreference ?? null,
    maxTravelMinutes: p.maxTravelMinutes ?? null,
  };
}

/** The guest's preferences (with favorite dishes) as recommendation input. */
export async function loadRecPreferences(prefs: PrefsRow & { id?: string }) {
  const dishes = prefs.id
    ? (await db.guestFavoriteDish.findMany({ where: { preferencesId: prefs.id }, select: { dishKey: true } })).map((d) => d.dishKey)
    : [];
  return toRecPreferences(prefs, dishes);
}

function toCandidate(listing: Listing, now: Date) {
  const bookable = listing.sessions.filter((s) => isBookable({ ...s, seatsReserved: s.capacity - s.seatsLeft, status: "SCHEDULED" }, now));
  if (!bookable.length) return null;
  return {
    ...listing,
    isSecretLocation: listing.venue.isSecret,
    hostType: listing.host.hostType,
    socialAtmosphere: listing.atmosphere,
    venueLat: listing.venue.lat,
    venueLng: listing.venue.lng,
    venueNeighborhood: listing.venue.neighborhood,
    nextStartsAt: bookable[0].startsAt,
    priceCents: bookable[0].priceCents,
    hostSlug: listing.host.slug,
    hostName: listing.host.displayName,
    dishes: listing.dishes,
    sessions: bookable,
    saveCount: listing.saves,
  } satisfies RecCandidate & Listing;
}

/** "Recommended for You": bookable listings ranked by transparent rules, with reasons. */
export async function getRecommendations(prefs: PrefsRow & { id?: string }, now: Date, limit = 4) {
  const [listings, recPrefs] = await Promise.all([getListings(now.toISOString()), loadRecPreferences(prefs)]);
  const candidates = listings.map((l) => toCandidate(l, now)).filter((c) => c !== null);
  return recommend(recPrefs, candidates, limit).map((r) => {
    const matched = r.item.sessions.find((s) => s.id === r.session?.id) ?? r.item.sessions[0];
    return {
      listing: { ...r.item, matched, matchedCount: 1, distance: r.distance } satisfies ListingMatch,
      reasons: r.reasons,
      discovery: !!r.discovery,
    };
  });
}

/**
 * Personal order for discovery results ("Recommended" sort): nothing is removed, listings are
 * re-ordered by fit and the strongest reason is returned for display.
 */
export async function personalizeResults(prefs: PrefsRow & { id?: string }, results: ListingMatch[]) {
  const recPrefs = await loadRecPreferences(prefs);
  const candidates = results.map((l) => ({
    ...l,
    isSecretLocation: l.venue.isSecret,
    hostType: l.host.hostType,
    socialAtmosphere: l.atmosphere,
    venueLat: l.venue.lat,
    venueLng: l.venue.lng,
    venueNeighborhood: l.venue.neighborhood,
    nextStartsAt: l.matched?.startsAt ?? null,
    priceCents: l.matched?.priceCents,
    hostSlug: l.host.slug,
    hostName: l.host.displayName,
    sessions: l.matched ? [l.matched] : [],
    saveCount: l.saves,
  }));
  // Stable: unmatched listings keep their original (recommended) order after the matches.
  const original = new Map(results.map((r, i) => [r.id, i]));
  return rankForGuest(recPrefs, candidates)
    .sort((a, b) => Math.max(b.score, 0) - Math.max(a.score, 0) || original.get(a.item.id)! - original.get(b.item.id)!)
    .map((r) => ({ listing: r.item as ListingMatch, reason: r.score > 0 ? r.reasons[0] : undefined }));
}
