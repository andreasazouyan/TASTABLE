"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/demo";
import { serverNow } from "@/lib/clock";
import { db } from "@/lib/db";
import { toggleSavedExperience } from "@/server/services/saved";

const schema = z.object({
  experienceId: z.string().min(1),
  path: z.string().startsWith("/").refine((p) => !p.startsWith("//")).catch("/"),
});

export async function toggleSaved(formData: FormData) {
  const { experienceId, path } = schema.parse(Object.fromEntries(formData));
  const user = await getCurrentUser();
  if (!user?.guestProfile) redirect(`/sign-in?next=${encodeURIComponent(path)}`);

  await toggleSavedExperience(db, { guestId: user.guestProfile.id, experienceId }, serverNow());

  revalidatePath("/saved");
  revalidatePath("/calendar");
}

const followSchema = z.object({
  hostSlug: z.string().min(1).max(80),
  path: z.string().startsWith("/").refine((p) => !p.startsWith("//")).catch("/"),
});

/** Follow or unfollow a host. Followed hosts are boosted in "Recommended for You". */
export async function toggleFollowHost(formData: FormData) {
  const { hostSlug, path } = followSchema.parse(Object.fromEntries(formData));
  const user = await getCurrentUser();
  if (!user?.guestProfile) redirect(`/sign-in?next=${encodeURIComponent(path)}`);
  const host = await db.hostProfile.findUnique({ where: { slug: hostSlug }, select: { slug: true } });
  if (!host) return;
  const prefs = await db.guestPreferences.findUnique({ where: { guestProfileId: user.guestProfile.id } });
  const current = (prefs?.followedHosts ?? "").split(",").filter(Boolean);
  const next = current.includes(hostSlug) ? current.filter((s) => s !== hostSlug) : [...current, hostSlug];
  await db.guestPreferences.upsert({
    where: { guestProfileId: user.guestProfile.id },
    create: { guestProfileId: user.guestProfile.id, followedHosts: next.join(",") },
    update: { followedHosts: next.join(",") },
  });
  revalidatePath(path);
  revalidatePath("/");
}
