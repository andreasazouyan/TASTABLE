"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentUser, requireHost } from "@/lib/auth/demo";
import { nyDateTime, serverNow } from "@/lib/clock";
import { db } from "@/lib/db";
import { serializeList } from "@/lib/domain/lists";
import { eventInput, expenseInput, hostProfileInput, venueRequestInput } from "@/lib/validation/event";
import { checkInTicket, cancelEvent, duplicateEvent, saveEvent, setPublication, slugify, assertOwnsExperience } from "@/server/services/host-events";
import { DomainError } from "@/server/services/errors";

export type FormState = { ok: boolean; message: string; fieldErrors?: Record<string, string[] | undefined> } | null;

function revalidateAll() {
  revalidatePath("/host", "layout");
  revalidatePath("/discover");
  revalidatePath("/");
}

function fail(e: unknown): FormState {
  if (e instanceof DomainError) return { ok: false, message: e.message };
  throw e;
}

// ─── Host onboarding & profile ────────────────────────────────────────────────

function parseHostProfile(fd: FormData) {
  return hostProfileInput.safeParse({
    hostType: fd.get("hostType"),
    displayName: fd.get("displayName"),
    tagline: fd.get("tagline"),
    bio: fd.get("bio"),
    background: fd.get("background"),
    cuisineExpertise: fd.getAll("cuisineExpertise").map(String),
    homeNeighborhood: fd.get("homeNeighborhood"),
    profilePhotoUrl: fd.get("profilePhotoUrl") ?? "",
    credentials: fd.get("credentials") ?? "",
    instagramHandle: fd.get("instagramHandle") ?? "",
  });
}

export async function saveHostProfileAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/host/onboarding");
  const parsed = parseHostProfile(fd);
  if (!parsed.success) return { ok: false, message: "Please check the highlighted fields.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const p = parsed.data;
  const data = {
    hostType: p.hostType,
    displayName: p.displayName,
    tagline: p.tagline,
    bio: p.bio,
    background: p.background,
    cuisineExpertise: serializeList(p.cuisineExpertise),
    homeNeighborhood: p.homeNeighborhood,
    profilePhotoUrl: p.profilePhotoUrl || null,
    credentials: p.credentials,
    instagramHandle: p.instagramHandle.replace(/^@/, "") || null,
  };
  const isNew = !user.hostProfile;
  if (isNew) {
    let slug = slugify(p.displayName);
    if (await db.hostProfile.findUnique({ where: { slug } })) slug = `${slug}-${user.id.slice(-5)}`;
    await db.hostProfile.create({ data: { ...data, slug, userId: user.id, isFictional: false, onboardingCompletedAt: serverNow() } });
    await db.user.update({ where: { id: user.id }, data: { role: user.role === "ADMIN" ? "ADMIN" : "HOST" } });
  } else {
    await db.hostProfile.update({ where: { userId: user.id }, data });
  }
  revalidateAll();
  if (isNew) redirect("/host?welcome=1");
  return { ok: true, message: "Profile saved." };
}

// ─── Events ───────────────────────────────────────────────────────────────────

export async function saveEventAction(payloadJson: string, experienceId?: string): Promise<FormState & { id?: string }> {
  const { host } = await requireHost();
  let raw: unknown;
  try {
    raw = JSON.parse(payloadJson);
  } catch {
    return { ok: false, message: "Invalid form data." };
  }
  const parsed = eventInput.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors = z.flattenError(parsed.error).fieldErrors as Record<string, string[] | undefined>;
    const first = parsed.error.issues[0];
    return { ok: false, message: `${first.path.join(" › ") || "Form"}: ${first.message}`, fieldErrors };
  }
  try {
    const exp = await saveEvent(db, host.id, parsed.data, serverNow(), experienceId);
    revalidateAll();
    revalidatePath(`/experiences/${exp.slug}`);
    return { ok: true, message: parsed.data.intent === "publish" ? "Published. It's now live in guest discovery." : "Draft saved.", id: exp.id };
  } catch (e) {
    return { ...fail(e)! };
  }
}

const idSchema = z.object({ experienceId: z.string().min(1) });

export async function eventCommandAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const { host } = await requireHost();
  const { experienceId } = idSchema.parse({ experienceId: fd.get("experienceId") });
  const command = z.enum(["publish", "unpublish", "duplicate", "cancel"]).parse(fd.get("command"));
  const now = serverNow();
  try {
    if (command === "duplicate") {
      const copy = await duplicateEvent(db, host.id, experienceId, now);
      revalidateAll();
      redirect(`/host/events/${copy.id}/edit?duplicated=1`);
    }
    if (command === "cancel") {
      const { refundedBookings } = await cancelEvent(db, host.id, experienceId, now);
      revalidateAll();
      return { ok: true, message: `Event cancelled. ${refundedBookings} booking(s) fully refunded (simulated).` };
    }
    await setPublication(db, host.id, experienceId, command === "publish" ? "PUBLISHED" : "UNPUBLISHED", now);
    revalidateAll();
    return { ok: true, message: command === "publish" ? "Published to guest discovery." : "Unpublished. Existing bookings are kept." };
  } catch (e) {
    return fail(e);
  }
}

// ─── Reservations ─────────────────────────────────────────────────────────────

export async function checkInAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const { host } = await requireHost();
  const code = z.string().trim().min(4, "Enter a ticket code").safeParse(fd.get("code"));
  if (!code.success) return { ok: false, message: code.error.issues[0].message };
  const result = await checkInTicket(db, host.id, code.data, serverNow());
  revalidatePath("/host/reservations");
  return { ok: result.ok, message: result.message };
}

export async function hostCancelBookingAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const { host } = await requireHost();
  const bookingId = z.string().min(1).parse(fd.get("bookingId"));
  const { cancelBooking } = await import("@/server/services/bookings");
  try {
    const r = await cancelBooking(db, { bookingId, actor: "HOST", hostId: host.id, reason: "Cancelled by host" }, serverNow());
    revalidateAll();
    return { ok: true, message: r.alreadyCancelled ? "Already cancelled." : "Booking cancelled and fully refunded (simulated)." };
  } catch (e) {
    return fail(e);
  }
}

// ─── Venue assistance ─────────────────────────────────────────────────────────

export async function venueRequestAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const { host } = await requireHost();
  const parsed = venueRequestInput.safeParse({
    neighborhoods: fd.getAll("neighborhoods").map(String),
    guestCount: fd.get("guestCount"),
    preferredDates: fd.get("preferredDates"),
    budgetDollars: fd.get("budgetDollars") ?? "",
    needsKitchen: fd.get("needsKitchen") === "on",
    notes: fd.get("notes") ?? "",
  });
  if (!parsed.success) return { ok: false, message: "Please check the highlighted fields.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const p = parsed.data;
  await db.venueAssistanceRequest.create({
    data: {
      hostId: host.id,
      neighborhoods: serializeList(p.neighborhoods),
      guestCount: p.guestCount,
      preferredDates: p.preferredDates,
      budgetCents: p.budgetDollars === "" ? null : Math.round(p.budgetDollars * 100),
      needsKitchen: p.needsKitchen,
      notes: p.notes || null,
      createdAt: serverNow(),
    },
  });
  revalidatePath("/host/venue-request");
  return {
    ok: true,
    message: "Request received. This is a request only: Tastable has not secured a venue. In this prototype no one will follow up.",
  };
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export async function saveExpenseAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const { host } = await requireHost();
  const parsed = expenseInput.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, message: "Please check the expense.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const e = parsed.data;
  try {
    await assertOwnsExperience(db, host.id, e.experienceId);
    if (e.sessionId) {
      const s = await db.experienceSession.findUnique({ where: { id: e.sessionId } });
      if (!s || s.experienceId !== e.experienceId) throw new DomainError("That date doesn't belong to this event.");
    }
    const data = {
      experienceId: e.experienceId,
      sessionId: e.sessionId || null,
      category: e.category,
      description: e.description,
      amountCents: Math.round(e.amountDollars * 100),
      incurredAt: nyDateTime(e.incurredOn, 12),
    };
    if (e.id) {
      const existing = await db.eventExpense.findUnique({ where: { id: e.id } });
      if (!existing || existing.hostId !== host.id) throw new DomainError("Expense not found.", "NOT_FOUND");
      await db.eventExpense.update({ where: { id: e.id }, data });
    } else {
      await db.eventExpense.create({ data: { ...data, hostId: host.id } });
    }
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/host", "layout");
  return { ok: true, message: e.id ? "Expense updated." : "Expense added." };
}

export async function deleteExpenseAction(fd: FormData) {
  const { host } = await requireHost();
  const id = z.string().min(1).parse(fd.get("id"));
  await db.eventExpense.deleteMany({ where: { id, hostId: host.id } }); // scoped to the host: no cross-host deletes
  revalidatePath("/host", "layout");
}
