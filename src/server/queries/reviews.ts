import "server-only";

import { db } from "@/lib/db";
import { COUNTED_REVIEW_WHERE, ratingFromAggregate, ratingSummary, reviewOrderBy, type ReviewSort } from "@/lib/reviews";

/**
 * Host rating for many hosts at once (cards, lists). Verified, non-removed reviews only.
 * Hosts without reviews are returned as { average: null, count: 0, isNew: true }.
 */
export async function getHostRatings(hostIds: string[]) {
  const rows = hostIds.length
    ? await db.review.groupBy({ by: ["hostId"], where: { hostId: { in: hostIds }, ...COUNTED_REVIEW_WHERE }, _sum: { rating: true }, _count: { _all: true } })
    : [];
  const byHost = new Map(rows.map((r) => [r.hostId, ratingFromAggregate(r._sum.rating ?? 0, r._count._all)]));
  return new Map(hostIds.map((id) => [id, byHost.get(id) ?? ratingFromAggregate(0, 0)]));
}

export async function getHostRating(hostId: string) {
  const rows = await db.review.findMany({ where: { hostId, ...COUNTED_REVIEW_WHERE }, select: { rating: true } });
  return ratingSummary(rows.map((r) => r.rating));
}

export async function getExperienceRating(experienceId: string) {
  const rows = await db.review.findMany({ where: { experienceId, ...COUNTED_REVIEW_WHERE }, select: { rating: true } });
  return ratingSummary(rows.map((r) => r.rating));
}

const publicReviewSelect = {
  id: true,
  rating: true,
  body: true,
  foodRating: true,
  atmosphereRating: true,
  organizationRating: true,
  valueRating: true,
  verifiedAttendance: true,
  status: true,
  createdAt: true,
  editedAt: true,
  experience: { select: { slug: true, title: true } },
  session: { select: { startsAt: true } },
  // Public reviews show the reviewer's first name only.
  guest: { select: { displayName: true } },
} as const;

function toPublic<T extends { guest: { displayName: string } }>(r: T) {
  const { guest, ...rest } = r;
  return { ...rest, reviewerFirstName: guest.displayName.split(" ")[0] ?? "Guest" };
}

/** Public reviews for a host (all their events) or one event. Removed reviews never appear. */
export async function getPublicReviews(scope: { hostId: string } | { experienceId: string }, sort: ReviewSort = "recent", take = 50) {
  const rows = await db.review.findMany({
    where: { ...scope, status: { not: "REMOVED" } },
    orderBy: reviewOrderBy(sort),
    take,
    select: publicReviewSelect,
  });
  return rows.map(toPublic);
}

/** A guest's own reviews (My Reviews), including any moderation state. */
export async function getGuestReviews(guestId: string) {
  return db.review.findMany({
    where: { guestId },
    orderBy: { createdAt: "desc" },
    select: { ...publicReviewSelect, bookingId: true, guest: undefined },
  });
}
