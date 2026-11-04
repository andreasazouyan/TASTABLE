/**
 * Puts Tastable's own event images (public/tastable-event-images) in front of the existing
 * photos of the matching FICTIONAL sample events, for databases seeded before the images existed.
 * Idempotent and additive: it adds missing images and reorders (own images first, in mapping
 * order, then every other photo in its previous order). It never deletes photos and never touches
 * hosts' own events, bookings or anything else. Runs during the hosted build after migrations;
 * also: npm run images:apply
 */
import "dotenv/config";

import { Client } from "pg";
import { randomUUID } from "node:crypto";

import { EVENT_IMAGE_CREDIT, EVENT_DETAIL_IMAGES, EVENT_IMAGES, eventImagesFor } from "../src/lib/domain/event-images";

export async function applyEventImages(connectionString: string) {
  const client = new Client({ connectionString });
  await client.connect();
  let added = 0;
  try {
    const slugs = [...new Set([...Object.keys(EVENT_IMAGES), ...Object.keys(EVENT_DETAIL_IMAGES)])];
    for (const slug of slugs) {
      const wanted = eventImagesFor(slug);
      await client.query("BEGIN");
      const exp = await client.query<{ id: string }>(`SELECT id FROM "Experience" WHERE slug = $1 AND "isFictional" = true`, [slug]);
      for (const { id } of exp.rows) {
        const { rows: photos } = await client.query<{ id: string; url: string }>(
          `SELECT id, url FROM "ExperiencePhoto" WHERE "experienceId" = $1 ORDER BY "sortOrder", "createdAt", id`,
          [id],
        );
        const ordered: string[] = [];
        for (const img of wanted) {
          const existing = photos.find((p) => p.url === img.url);
          if (existing) ordered.push(existing.id);
          else {
            const newId = `ph_${randomUUID()}`;
            await client.query(`INSERT INTO "ExperiencePhoto" (id, "experienceId", url, alt, credit, "sortOrder") VALUES ($1, $2, $3, $4, $5, 0)`, [newId, id, img.url, img.alt, EVENT_IMAGE_CREDIT]);
            ordered.push(newId);
            added++;
          }
        }
        for (const p of photos) if (!ordered.includes(p.id)) ordered.push(p.id);
        for (const [i, photoId] of ordered.entries()) await client.query(`UPDATE "ExperiencePhoto" SET "sortOrder" = $1 WHERE id = $2`, [i, photoId]);
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
  applyEventImages(url).then((n) => console.log(`Event images: ${n} image(s) added.`));
}
