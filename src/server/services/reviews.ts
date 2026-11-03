import type { PrismaClient } from "@/generated/prisma/client";
import { ELIGIBILITY_MESSAGES, reportInput, reviewEligibility, reviewInput } from "@/lib/reviews";
import { DomainError } from "@/server/services/errors";

type Db = PrismaClient;

function loadBooking(db: Db, bookingId: string) {
  return db.booking.findUnique({
    where: { id: bookingId },
    include: {
      session: { select: { id: true, endsAt: true, experience: { select: { id: true, hostId: true } } } },
      tickets: { select: { status: true, checkedInAt: true } },
      review: { select: { id: true } },
    },
  });
}

/** Can this guest review this booking right now? (for "Leave a Review" buttons) */
export async function getReviewEligibility(db: Db, guestId: string, bookingId: string, now: Date) {
  const booking = await loadBooking(db, bookingId);
  return reviewEligibility(booking && booking.guestId === guestId ? booking : null, now);
}

/**
 * Creates a verified review. Every relationship (guest, event, host, session) comes from the
 * booking on the server; the client only sends the booking id, ratings and text.
 */
export async function createReview(db: Db, args: { guestId: string; bookingId: string; input: unknown }, now: Date) {
  const parsed = reviewInput.safeParse(args.input);
  if (!parsed.success) throw new DomainError(parsed.error.issues[0]?.message ?? "Invalid review.");
  const booking = await loadBooking(db, args.bookingId);
  const check = reviewEligibility(booking && booking.guestId === args.guestId ? booking : null, now);
  if (!check.eligible) throw new DomainError(ELIGIBILITY_MESSAGES[check.reason], check.reason === "NOT_FOUND" ? "NOT_FOUND" : "CONFLICT");
  try {
    return await db.review.create({
      data: {
        ...parsed.data,
        guestId: booking!.guestId,
        bookingId: booking!.id,
        sessionId: booking!.session.id,
        experienceId: booking!.session.experience.id,
        hostId: booking!.session.experience.hostId,
        verifiedAttendance: true,
        createdAt: now,
      },
    });
  } catch (e) {
    // Unique (bookingId) / (guestId, sessionId): a concurrent duplicate submit.
    if ((e as { code?: string }).code === "P2002") throw new DomainError(ELIGIBILITY_MESSAGES.ALREADY_REVIEWED, "CONFLICT");
    throw e;
  }
}

/** Guests can edit their own review. Moderation status is unchanged by an edit. */
export async function updateReview(db: Db, args: { guestId: string; reviewId: string; input: unknown }, now: Date) {
  const parsed = reviewInput.safeParse(args.input);
  if (!parsed.success) throw new DomainError(parsed.error.issues[0]?.message ?? "Invalid review.");
  const review = await db.review.findUnique({ where: { id: args.reviewId }, select: { guestId: true, status: true } });
  if (!review || review.guestId !== args.guestId) throw new DomainError("Review not found.", "NOT_FOUND");
  if (review.status === "REMOVED") throw new DomainError("This review was removed by moderation and can't be edited.", "CONFLICT");
  return db.review.update({ where: { id: args.reviewId }, data: { ...parsed.data, editedAt: now } });
}

/**
 * Reports a review for moderation. Reporting never hides the review; it opens a report and moves
 * the review to UNDER_REVIEW (still public and still counted) until a moderator decides.
 * One report per user per review.
 */
export async function reportReview(db: Db, args: { reporterUserId: string; reviewId: string; input: unknown }, now: Date) {
  const parsed = reportInput.safeParse(args.input);
  if (!parsed.success) throw new DomainError("Choose a reason for the report.");
  const review = await db.review.findUnique({ where: { id: args.reviewId }, select: { id: true, status: true, guest: { select: { userId: true } } } });
  if (!review || review.status === "REMOVED") throw new DomainError("Review not found.", "NOT_FOUND");
  if (review.guest.userId === args.reporterUserId) throw new DomainError("You can't report your own review.", "FORBIDDEN");
  return db.$transaction(async (tx) => {
    const report = await tx.reviewReport.upsert({
      where: { reviewId_reporterId: { reviewId: review.id, reporterId: args.reporterUserId } },
      create: { reviewId: review.id, reporterId: args.reporterUserId, reason: parsed.data.reason, details: parsed.data.details || null, createdAt: now },
      update: { reason: parsed.data.reason, details: parsed.data.details || null },
    });
    if (review.status === "PUBLISHED") await tx.review.update({ where: { id: review.id }, data: { status: "UNDER_REVIEW" } });
    return report;
  });
}

/** Moderator decision. "keep" restores PUBLISHED and dismisses open reports; "remove" hides it. */
export async function moderateReview(db: Db, args: { reviewId: string; decision: "keep" | "remove" }, now: Date) {
  return db.$transaction(async (tx) => {
    const review = await tx.review.update({ where: { id: args.reviewId }, data: { status: args.decision === "keep" ? "PUBLISHED" : "REMOVED" } });
    await tx.reviewReport.updateMany({
      where: { reviewId: args.reviewId, status: "OPEN" },
      data: { status: args.decision === "keep" ? "DISMISSED" : "ACTIONED", resolvedAt: now },
    });
    return review;
  });
}
