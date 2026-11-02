import "server-only";

import { PERSONA_IDS } from "@/lib/domain/personas";

import { db } from "@/lib/db";

export async function getSavedIds(guestId: string | undefined | null) {
  if (!guestId) return new Set<string>();
  const rows = await db.savedExperience.findMany({ where: { guestId }, select: { experienceId: true } });
  return new Set(rows.map((r) => r.experienceId));
}

export async function getDemoIdentities() {
  const [guests, hosts] = await Promise.all([
    db.user.findMany({
      where: { isDemo: true, id: { in: PERSONA_IDS } },
      include: { guestProfile: { include: { preferences: true } } },
      orderBy: { name: "asc" },
    }),
    db.user.findMany({
      where: { isDemo: true, role: "HOST" },
      include: { hostProfile: true },
      orderBy: { name: "asc" },
    }),
  ]);
  // Persona order (student, professional, high-budget fan, new guest), not alphabetical.
  guests.sort((a, b) => PERSONA_IDS.indexOf(a.id) - PERSONA_IDS.indexOf(b.id));
  return { guests, hosts };
}
