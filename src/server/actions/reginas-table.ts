"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/demo";
import { serverNow } from "@/lib/clock";
import { db } from "@/lib/db";
import { demoToolsEnabled, REGINA_SLUG } from "@/lib/domain/reginas-table";
import { reginaReservationFromFormData } from "@/lib/validation/reginas-table";
import { DomainError } from "@/server/services/errors";
import { findReginaReservation, reserveReginasTable, resetReginasTableDemo } from "@/server/services/reginas-table";

export type ReginaReserveState = { error?: string; fieldErrors?: Record<string, string[] | undefined>; existingReference?: string } | null;

function revalidateViews() {
  revalidatePath("/bookings");
  revalidatePath("/calendar");
  revalidatePath("/discover");
  revalidatePath("/host", "layout");
  revalidatePath(`/experiences/${REGINA_SLUG}`);
}

/** Reserve 1 or more seats, free. Validated on the server; seats are reserved atomically. */
export async function reserveReginasTableAction(_prev: ReginaReserveState, formData: FormData): Promise<ReginaReserveState> {
  const user = await getCurrentUser();
  if (!user?.guestProfile) return { error: "Log in or create an account before reserving." };

  const parsed = reginaReservationFromFormData(formData);
  if (!parsed.success) return { error: "Please check the highlighted fields.", fieldErrors: z.flattenError(parsed.error).fieldErrors };

  let reference: string;
  try {
    const booking = await reserveReginasTable(db, user.guestProfile.id, parsed.data, serverNow());
    reference = booking.reference;
  } catch (e) {
    if (e instanceof DomainError) {
      const existing = await findReginaReservation(db, user.guestProfile.id);
      return { error: e.message, existingReference: existing?.reference };
    }
    throw e;
  }
  revalidateViews();
  redirect(`/bookings/${reference}?confirmed=1`);
}

export type ResetState = { ok: boolean; message: string } | null;

/** Developer-only: restores the 6 available seats and clears only reservations made in the demo. */
export async function resetReginasTableAction(): Promise<ResetState> {
  if (!demoToolsEnabled()) return { ok: false, message: "Demo tools are turned off here." };
  try {
    const r = await resetReginasTableDemo(db);
    revalidateViews();
    return { ok: true, message: `Demo event reset: ${r.removed} demo ${r.removed === 1 ? "reservation" : "reservations"} cleared, ${r.seatsLeft} seats available.` };
  } catch (e) {
    if (e instanceof DomainError) return { ok: false, message: e.message };
    throw e;
  }
}
