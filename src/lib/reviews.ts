import { z } from "zod";

/**
 * Reviews: eligibility, validation and the ONE rating calculation used everywhere
 * (cards, event pages, host profiles). Pure functions; the services and queries call these.
 */

export const REVIEW_MIN_LENGTH = 10;
export const REVIEW_MAX_LENGTH = 2000;

const stars = z.coerce.number().int().min(1, "Ratings are 1 to 5 stars").max(5, "Ratings are 1 to 5 stars");
const optionalStars = z.union([z.literal("").transform(() => null), z.null(), stars]).optional().transform((v) => v ?? null);

export const reviewInput = z.object({
  rating: stars,
  body: z.string().trim().min(REVIEW_MIN_LENGTH, `Write at least ${REVIEW_MIN_LENGTH} characters`).max(REVIEW_MAX_LENGTH),
  foodRating: optionalStars,
  atmosphereRating: optionalStars,
  organizationRating: optionalStars,
  valueRating: optionalStars,
});
export type ReviewInput = z.infer<typeof reviewInput>;

export const REPORT_REASONS = [
  { key: "OFF_TOPIC", label: "Not about this experience" },
  { key: "INAPPROPRIATE", label: "Offensive or inappropriate" },
  { key: "PERSONAL_INFO", label: "Shares personal information" },
  { key: "SPAM", label: "Spam or advertising" },
  { key: "OTHER", label: "Something else" },
] as const;
export const reportInput = z.object({
  reason: z.enum(REPORT_REASONS.map((r) => r.key) as [string, ...string[]]),
  details: z.string().trim().max(500).optional(),
});

export type ReviewEligibility =
  | { eligible: true; verified: true }
  | { eligible: false; reason: "CANCELLED" | "NOT_ENDED" | "NOT_VERIFIED" | "ALREADY_REVIEWED" | "NOT_FOUND" };

/**
 * A guest may review a session only when it has ended, their booking was not cancelled, and
 * attendance was verified by a checked-in ticket. One review per booking (= guest + session).
 */
export function reviewEligibility(
  booking: { status: string; session: { endsAt: Date }; tickets: { status: string; checkedInAt?: Date | null }[]; review?: unknown | null } | null,
  now: Date,
): ReviewEligibility {
  if (!booking) return { eligible: false, reason: "NOT_FOUND" };
  if (booking.status === "CANCELLED") return { eligible: false, reason: "CANCELLED" };
  if (booking.session.endsAt.getTime() > now.getTime()) return { eligible: false, reason: "NOT_ENDED" };
  if (!booking.tickets.some((t) => t.status === "CHECKED_IN")) return { eligible: false, reason: "NOT_VERIFIED" };
  if (booking.review) return { eligible: false, reason: "ALREADY_REVIEWED" };
  return { eligible: true, verified: true };
}

export const ELIGIBILITY_MESSAGES: Record<Exclude<ReviewEligibility, { eligible: true }>["reason"], string> = {
  CANCELLED: "Cancelled bookings can't be reviewed.",
  NOT_ENDED: "You can review this experience once it has ended.",
  NOT_VERIFIED: "Only guests whose attendance was verified at check-in can leave a review.",
  ALREADY_REVIEWED: "You've already reviewed this experience. You can edit your review instead.",
  NOT_FOUND: "Booking not found.",
};

/** Reviews that count toward ratings: verified attendance, not removed by moderation. */
export const COUNTED_REVIEW_WHERE = { verifiedAttendance: true, status: { not: "REMOVED" as const } };

export type RatingSummary = { average: number | null; count: number; isNew: boolean; distribution: [number, number, number, number, number] };

/** The single rating calculation. Average rounded to one decimal; null (and "New host") with no reviews. */
export function ratingSummary(ratings: number[]): RatingSummary {
  const valid = ratings.filter((r) => Number.isInteger(r) && r >= 1 && r <= 5);
  const distribution: RatingSummary["distribution"] = [0, 0, 0, 0, 0];
  for (const r of valid) distribution[r - 1]++;
  if (!valid.length) return { average: null, count: 0, isNew: true, distribution };
  const average = Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10;
  return { average, count: valid.length, isNew: false, distribution };
}

/** Same calculation from SQL aggregates (sum and count of counted reviews). */
export function ratingFromAggregate(sum: number, count: number): Pick<RatingSummary, "average" | "count" | "isNew"> {
  if (!count) return { average: null, count: 0, isNew: true };
  return { average: Math.round((sum / count) * 10) / 10, count, isNew: false };
}

/** Fill (0–1) for each of five stars, for partially filled star display. */
export function starFills(average: number | null): number[] {
  return Array.from({ length: 5 }, (_, i) => (average === null ? 0 : Math.max(0, Math.min(1, average - i))));
}

export function ratingLabel(s: Pick<RatingSummary, "average" | "count">) {
  if (s.average === null || !s.count) return "New host";
  return `${s.average.toFixed(1)} (${s.count} ${s.count === 1 ? "review" : "reviews"})`;
}

export type ReviewSort = "recent" | "highest" | "lowest";
export const REVIEW_SORTS: { key: ReviewSort; label: string }[] = [
  { key: "recent", label: "Most Recent" },
  { key: "highest", label: "Highest" },
  { key: "lowest", label: "Lowest" },
];
export function reviewOrderBy(sort: ReviewSort) {
  if (sort === "highest") return [{ rating: "desc" as const }, { createdAt: "desc" as const }];
  if (sort === "lowest") return [{ rating: "asc" as const }, { createdAt: "desc" as const }];
  return [{ createdAt: "desc" as const }];
}
