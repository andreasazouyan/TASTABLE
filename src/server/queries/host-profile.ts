import "server-only";

import { db } from "@/lib/db";
import { parseList } from "@/lib/domain/lists";
import type { ReviewSort } from "@/lib/reviews";
import { getListings } from "@/server/queries/listings";
import { getAspectAverages, getHostRating, getPublicReviews } from "@/server/queries/reviews";

/**
 * The public host profile: who they are, their rating (verified reviews only), reviews, past
 * events with dates and upcoming events. Nothing private (no guest identities, no finances).
 */
export async function getPublicHostProfile(slug: string, now: Date, sort: ReviewSort, viewerGuestId?: string | null) {
  const host = await db.hostProfile.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      displayName: true,
      hostType: true,
      tagline: true,
      background: true,
      bio: true,
      homeNeighborhood: true,
      cuisineExpertise: true,
      credentials: true,
      profilePhotoUrl: true,
      verified: true,
      isFictional: true,
      followerCount: true,
    },
  });
  if (!host) return null;

  const [rating, aspects, reviews, listings, past] = await Promise.all([
    getHostRating(host.id),
    getAspectAverages({ hostId: host.id }),
    getPublicReviews({ hostId: host.id }, sort, 50, viewerGuestId),
    getListings(now.toISOString()),
    // Past events: events that went live with at least one session that has ended.
    db.experience.findMany({
      where: { hostId: host.id, status: { in: ["PUBLISHED", "UNPUBLISHED", "ARCHIVED"] }, sessions: { some: { endsAt: { lte: now }, status: { not: "CANCELLED" } } } },
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
        sessions: { where: { endsAt: { lte: now }, status: { not: "CANCELLED" } }, orderBy: { startsAt: "desc" }, take: 3, select: { id: true, startsAt: true } },
      },
      orderBy: { title: "asc" },
    }),
  ]);

  return {
    host: { ...host, cuisineExpertise: parseList(host.cuisineExpertise), credentials: host.credentials.split("\n").filter(Boolean) },
    rating,
    aspects,
    reviews,
    upcoming: listings.filter((l) => l.host.id === host.id),
    past,
  };
}
