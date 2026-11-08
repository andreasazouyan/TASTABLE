/**
 * Runs during the hosted build (see "vercel-build" in package.json):
 *   1. applies pending migrations, then
 *   2. seeds the FICTIONAL demo data only if the database is empty, or when TASTABLE_RESEED=true,
 *      otherwise adds Regina's Nov 23 demo event if it's missing (or updates its date, title and copy).
 * Bookings made on the live demo therefore survive ordinary redeploys.
 */
import "dotenv/config";

import { execSync } from "node:child_process";
import { Client } from "pg";

import { DATABASE_URL_NAMES, directDatabaseUrl } from "../src/lib/database-url";
import { applyEventImages } from "./apply-event-images";

async function main() {
  const migrateUrl = directDatabaseUrl();
  if (!migrateUrl) {
    const env = process.env.VERCEL_ENV ?? "this";
    throw new Error(
      `No database connection string in the ${env} environment (looked for ${DATABASE_URL_NAMES.join(", ")}). ` +
        `In Vercel: project > Storage > create or select a Neon database > Connect Project, tick ${env === "this" ? "all environments" : `"${env}"`}, then redeploy.`,
    );
  }

  execSync("npx prisma migrate deploy", { stdio: "inherit" });

  const client = new Client({ connectionString: migrateUrl });
  await client.connect();
  const { rows } = await client.query<{ n: string }>('SELECT COUNT(*)::text AS n FROM "Experience"');
  await client.end();

  const empty = Number(rows[0].n) === 0;
  const forced = process.env.TASTABLE_RESEED === "true";
  if (empty || forced) {
    console.log(forced ? "TASTABLE_RESEED=true: resetting demo data." : "Empty database: seeding demo data.");
    execSync("npx tsx prisma/seed.ts", { stdio: "inherit", env: { ...process.env, DATABASE_URL: migrateUrl } });
  } else {
    console.log(`Demo data already present (${rows[0].n} experiences); skipping seed.`);
    // Additive only: put Tastable's event images in front of the sample events' photos.
    const added = await applyEventImages(migrateUrl);
    console.log(`Event images: ${added} image(s) added.`);
    // Additive only: add Regina's Nov 23 demo event if this database predates it, else update its date and copy.
    execSync("npx tsx scripts/reginas-table.ts add", { stdio: "inherit", env: { ...process.env, DATABASE_URL: migrateUrl } });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
