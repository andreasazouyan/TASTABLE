import type { PrismaClient } from "@/generated/prisma/client";
import { DomainError } from "@/server/services/errors";

type Db = PrismaClient;

/**
 * Save or unsave an event for a guest. SavedExperience has a (guestId, experienceId) primary key,
 * so a guest can save an event at most once. Experience.saveCount (unique savers) changes in the
 * same transaction, and only when a row was actually inserted or deleted: repeated or concurrent
 * clicks can't double count, and the count can't go below zero (also enforced by a DB check).
 */
export async function setSaved(db: Db, args: { guestId: string; experienceId: string; saved: boolean }, now: Date) {
  return db.$transaction(async (tx) => {
    const exists = await tx.experience.findUnique({ where: { id: args.experienceId }, select: { id: true } });
    if (!exists) throw new DomainError("Experience not found.", "NOT_FOUND");
    if (args.saved) {
      const inserted = await tx.$executeRaw`
        INSERT INTO "SavedExperience" ("guestId", "experienceId", "createdAt")
        VALUES (${args.guestId}, ${args.experienceId}, ${now})
        ON CONFLICT ("guestId", "experienceId") DO NOTHING`;
      if (inserted === 1) await tx.experience.update({ where: { id: args.experienceId }, data: { saveCount: { increment: 1 } } });
    } else {
      const removed = await tx.savedExperience.deleteMany({ where: { guestId: args.guestId, experienceId: args.experienceId } });
      if (removed.count === 1) {
        await tx.$executeRaw`UPDATE "Experience" SET "saveCount" = GREATEST("saveCount" - 1, 0) WHERE "id" = ${args.experienceId}`;
      }
    }
    const row = await tx.experience.findUniqueOrThrow({ where: { id: args.experienceId }, select: { saveCount: true } });
    return { saved: args.saved, saveCount: row.saveCount };
  });
}

/** Flip the current state. */
export async function toggleSavedExperience(db: Db, args: { guestId: string; experienceId: string }, now: Date) {
  const current = await db.savedExperience.findUnique({ where: { guestId_experienceId: args } });
  return setSaved(db, { ...args, saved: !current }, now);
}

/** Recomputes every counter from SavedExperience rows (seed, repair). Returns rows changed. */
export async function recomputeSaveCounts(db: Db) {
  return db.$executeRaw`
    UPDATE "Experience" e SET "saveCount" = COALESCE(s.n, 0)
    FROM "Experience" e2
    LEFT JOIN (SELECT "experienceId", count(*)::int AS n FROM "SavedExperience" GROUP BY "experienceId") s ON s."experienceId" = e2."id"
    WHERE e."id" = e2."id" AND e."saveCount" <> COALESCE(s.n, 0)`;
}
