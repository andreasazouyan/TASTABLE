"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/demo";
import { serverNow } from "@/lib/clock";
import { db } from "@/lib/db";
import { DomainError } from "@/server/services/errors";
import { createReview, reportReview, updateReview } from "@/server/services/reviews";

export type ActionResult = { ok: true; message: string } | { ok: false; message: string };

async function revalidateFor(reviewId: string) {
  const r = await db.review.findUnique({ where: { id: reviewId }, select: { experience: { select: { slug: true } }, host: { select: { slug: true } } } });
  if (r) {
    revalidatePath(`/experiences/${r.experience.slug}`);
    revalidatePath(`/hosts/${r.host.slug}`);
  }
  revalidatePath("/bookings");
  revalidatePath("/profile");
  revalidatePath("/discover");
  revalidatePath("/");
}

async function run(fn: () => Promise<{ id: string }>, message: string): Promise<ActionResult> {
  try {
    const r = await fn();
    await revalidateFor(r.id);
    return { ok: true, message };
  } catch (e) {
    if (e instanceof DomainError) return { ok: false, message: e.message };
    throw e;
  }
}

/** Leave a verified review. The booking (owned by the signed-in guest) decides everything else. */
export async function submitReviewAction(bookingId: string, input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user?.guestProfile) return { ok: false, message: "Log in first." };
  const guestId = user.guestProfile.id;
  return run(() => createReview(db, { guestId, bookingId, input }, serverNow()), "Thanks! Your review is live.");
}

export async function editReviewAction(reviewId: string, input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user?.guestProfile) return { ok: false, message: "Log in first." };
  const guestId = user.guestProfile.id;
  return run(() => updateReview(db, { guestId, reviewId, input }, serverNow()), "Your review was updated.");
}

/** Report a review. It stays visible (and counted) until Tastable's moderators decide. */
export async function reportReviewAction(reviewId: string, input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Log in to report a review." };
  return run(
    async () => {
      await reportReview(db, { reporterUserId: user.id, reviewId, input }, serverNow());
      return { id: reviewId };
    },
    "Thanks for flagging this. The review stays visible while our team takes a look.",
  );
}
