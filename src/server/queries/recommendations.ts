import "server-only";

import { isBookable } from "@/lib/booking/capacity";
import { parseList } from "@/lib/domain/lists";
import type { Listing, ListingMatch } from "@/lib/discovery/types";
import { recommend, type RecPreferences } from "@/lib/recommendations";
import { getListings } from "@/server/queries/listings";

type PrefsRow = {
  locationKey: string;
  travelRadiusMiles: number | null;
  favoriteCuisines: string;
  favoriteCategories: string;
  motivations: string;
  maxBudgetCents?: number | null;
  followedHosts?: string;
};

export function toRecPreferences(p: PrefsRow): RecPreferences {
  return {
    locationKey: p.locationKey,
    travelRadiusMiles: p.travelRadiusMiles,
    cuisines: parseList(p.favoriteCuisines),
    categories: parseList(p.favoriteCategories),
    motivations: parseList(p.motivations),
    maxBudgetCents: p.maxBudgetCents ?? null,
    followedHosts: parseList(p.followedHosts),
  };
}

/** "Recommended for You": bookable listings ranked by transparent rules, with reasons. */
export async function getRecommendations(prefs: PrefsRow, now: Date, limit = 4) {
  const listings = await getListings(now.toISOString());
  const candidates = listings
    .map((l) => {
      const next = l.sessions.find((s) => isBookable({ ...s, seatsReserved: s.capacity - s.seatsLeft, status: "SCHEDULED" }, now));
      return next ? { listing: l, next } : null;
    })
    .filter((x): x is { listing: Listing; next: Listing["sessions"][number] } => x !== null)
    .map(({ listing, next }) => ({
      ...listing,
      isSecretLocation: listing.venue.isSecret,
      hostType: listing.host.hostType,
      socialAtmosphere: listing.atmosphere,
      venueLat: listing.venue.lat,
      venueLng: listing.venue.lng,
      nextStartsAt: next.startsAt,
      priceCents: next.priceCents,
      hostSlug: listing.host.slug,
      hostName: listing.host.displayName,
      next,
    }));

  return recommend(toRecPreferences(prefs), candidates, limit).map((r) => ({
    listing: { ...r.item, matched: r.item.next, matchedCount: 1, distance: r.distance } satisfies ListingMatch,
    reasons: r.reasons,
  }));
}
