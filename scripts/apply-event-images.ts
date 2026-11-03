/**
 * Puts Tastable's own event images (public/tastable-event-images) in front of the existing
 * photos of the matching FICTIONAL sample events, for databases seeded before the images existed.
 * Idempotent and additive: it never deletes photos and never touches hosts' own events, bookings
 * or anything else. Runs during the hosted build after migrations; also: npm run images:apply
 */
import "dotenv/config";

import { Client } from "pg";
import { randomUUID } from "node:crypto";

import { EVENT_IMAGE_CREDIT, EVENT_IMAGES, eventImageFor } from "../src/lib/domain/event-images";

export async function applyEventImages(connectionString: string) {
  const client = new Client({ connectionString });
  await client.connect();
  let added = 0;
  try {
    for (const slug of Object.keys(EVENT_IMAGES)) {
      const img = eventImageFor(slug)!;
      await client.query("BEGIN");
      const { rows } = await client.query<{ id: string }>(
        `SELECT e.id FROM "Experience" e WHERE e.slug = $1 AND e."isFictional" = true
           AND NOT EXISTS (SELECT 1 FROM "ExperiencePhoto" p WHERE p."experienceId" = e.id AND p.url = $2)`,
        [slug, img.url],
      );
      for (const { id } of rows) {
        await client.query(`UPDATE "ExperiencePhoto" SET "sortOrder" = "sortOrder" + 1 WHERE "experienceId" = $1`, [id]);
        await client.query(`INSERT INTO "ExperiencePhoto" (id, "experienceId", url, alt, credit, "sortOrder") VALUES ($1, $2, $3, $4, $5, 0)`, [
          `ph_${randomUUID()}`,
          id,
          img.url,
          img.alt,
          EVENT_IMAGE_CREDIT,
        ]);
        added++;
      }
      await client.query("COMMIT");
    }
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    await client.end();
  }
  return added;
}

if (process.argv[1]?.endsWith("apply-event-images.ts")) {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  applyEventImages(url).then((n) => console.log(`Event images: ${n} cover(s) added.`));
}
