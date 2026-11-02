"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/demo";
import { serverNow } from "@/lib/clock";
import { db } from "@/lib/db";
import { joinWaitlist, leaveWaitlist } from "@/server/services/bookings";
import { DomainError } from "@/server/services/errors";

export type ActionResult = { ok: boolean; message: string };

export async function joinWaitlistAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = z
    .object({ sessionId: z.string().min(1), partySize: z.coerce.number().int().min(1).max(8), path: z.string().startsWith("/") })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please choose a party size." };
  const user = await getCurrentUser();
  if (!user?.guestProfile) redirect(`/sign-in?next=${encodeURIComponent(parsed.data.path)}`);
  try {
    await joinWaitlist(db, { guestId: user.guestProfile.id, sessionId: parsed.data.sessionId, partySize: parsed.data.partySize }, serverNow());
  } catch (e) {
    if (e instanceof DomainError) return { ok: false, message: e.message };
    throw e;
  }
  revalidatePath("/bookings");
  return { ok: true, message: "You're on the waitlist. We'll mark it here if seats open up." };
}

export async function leaveWaitlistAction(formData: FormData) {
  const entryId = z.string().min(1).parse(formData.get("entryId"));
  const user = await getCurrentUser();
  if (!user?.guestProfile) redirect("/sign-in?next=/bookings");
  await leaveWaitlist(db, { guestId: user.guestProfile.id, entryId });
  revalidatePath("/bookings");
}
