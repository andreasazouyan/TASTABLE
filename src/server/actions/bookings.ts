"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/demo";
import { serverNow } from "@/lib/clock";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { checkoutFromFormData } from "@/lib/validation/checkout";
import { cancelBooking, createBooking } from "@/server/services/bookings";
import { DomainError } from "@/server/services/errors";
import { dismissReminder } from "@/server/services/reminders";

export type CheckoutState = { error?: string; fieldErrors?: Record<string, string[] | undefined> } | null;

function revalidateBookingViews(slug?: string) {
  revalidatePath("/bookings");
  revalidatePath("/calendar");
  revalidatePath("/discover");
  revalidatePath("/host", "layout");
  if (slug) revalidatePath(`/experiences/${slug}`);
}

/** Demo checkout. Validates on the server, reserves seats atomically, simulates payment. */
export async function checkoutAction(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const user = await getCurrentUser();
  if (!user?.guestProfile) return { error: "Log in or create an account before booking." };

  const parsed = checkoutFromFormData(formData);
  if (!parsed.success) {
    return { error: "Please check the highlighted fields.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const input = parsed.data;
  const now = serverNow(); // one clock reading for the whole operation

  let reference: string;
  let slug: string | undefined;
  try {
    const booking = await createBooking(
      db,
      {
        guestId: user.guestProfile.id,
        sessionId: input.sessionId,
        ticketCount: input.ticketCount,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        dietaryRequirements: input.dietaryRequirements,
        attendees: Array.from({ length: input.ticketCount }, (_, i) => ({
          name: i === 0 ? input.contactName : input.attendeeNames[i - 1] || null,
          dietaryNotes: i === 0 ? null : input.attendeeDietary[i - 1] || null,
        })),
        acknowledgedPolicy: true,
      },
      now,
    );
    reference = booking.reference;
    const session = await db.experienceSession.findUnique({ where: { id: input.sessionId }, select: { experience: { select: { slug: true } } } });
    slug = session?.experience.slug;
  } catch (e) {
    if (e instanceof DomainError) return { error: e.message };
    throw e;
  }
  revalidateBookingViews(slug);
  redirect(`/bookings/${reference}?confirmed=1`);
}

export type CancelState = { ok: boolean; message: string } | null;

/** Guest cancellation. Safe to submit twice: the second request returns the stored outcome. */
export async function cancelBookingAction(_prev: CancelState, formData: FormData): Promise<CancelState> {
  const bookingId = z.string().min(1).parse(formData.get("bookingId"));
  const user = await getCurrentUser();
  if (!user?.guestProfile) return { ok: false, message: "Sign in to manage bookings." };
  try {
    const result = await cancelBooking(db, { bookingId, actor: "GUEST", guestId: user.guestProfile.id, reason: String(formData.get("reason") ?? "") || undefined }, serverNow());
    revalidateBookingViews();
    return {
      ok: true,
      message: result.alreadyCancelled
        ? "This booking was already cancelled. Nothing else changed."
        : `Booking cancelled. ${result.feeCents ? `A ${formatMoney(result.feeCents)} cancellation fee was kept and ` : ""}${formatMoney(result.refundCents)} ${result.feeCents ? "was" : "is being"} refunded (simulated).`,
    };
  } catch (e) {
    if (e instanceof DomainError) return { ok: false, message: e.message };
    throw e;
  }
}

/** Hides an in-app reminder for the signed-in guest. */
export async function dismissReminderAction(formData: FormData) {
  const reminderId = z.string().min(1).parse(formData.get("reminderId"));
  const user = await getCurrentUser();
  if (!user?.guestProfile) return;
  try {
    await dismissReminder(db, user.guestProfile.id, reminderId, serverNow());
  } catch (e) {
    if (!(e instanceof DomainError)) throw e;
  }
  revalidateBookingViews();
}
