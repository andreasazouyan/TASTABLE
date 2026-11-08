/**
 * Runs during the hosted build (see "vercel-build" in package.json):
 *   1. applies pending migrations, then
 *   2. seeds the FICTIONAL demo data if the database is empty, its seed version differs from SEED_VERSION,
 *      or TASTABLE_RESEED=true;
 *      otherwise adds Regina's Nov 23 demo event if it's missing (or updates its date, title and copy).
 * Bookings made on the live demo therefore survive ordinary redeploys.
 */
import "dotenv/config";

import { execSync } from "node:child_process";
import { Client } from "pg";

import { DATABASE_URL_NAMES, directDatabaseUrl } from "../src/lib/database-url";
import { applyEventImages } from "./apply-event-images";

/**
 * Bump this when the demo data should be rebuilt on the next deploy (for example after merging
 * features that add seed data). A database seeded with another version is wiped and re-seeded once;
 * otherwise ordinary redeploys keep bookings made on the live demo.
 */
const SEED_VERSION = "2026-11-08-all-features";

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
  const stored = await client.query<{ v: string | null }>("SELECT obj_description('public'::regnamespace, 'pg_namespace') AS v");
  const storedVersion = stored.rows[0]?.v?.replace(/^tastable-seed:/, "") ?? null;

  const empty = Number(rows[0].n) === 0;
  const forced = process.env.TASTABLE_RESEED === "true";
  const outdated = storedVersion !== SEED_VERSION;
  if (empty || forced || outdated) {
    console.log(
      forced
        ? "TASTABLE_RESEED=true: resetting demo data."
        : empty
          ? "Empty database: seeding demo data."
          : `Demo data version ${storedVersion ?? "(none)"} differs from ${SEED_VERSION}: re-seeding demo data.`,
    );
    execSync("npx tsx prisma/seed.ts", { stdio: "inherit", env: { ...process.env, DATABASE_URL: migrateUrl } });
    await client.query(`COMMENT ON SCHEMA public IS 'tastable-seed:${SEED_VERSION}'`);
    await client.end();
  } else {
    await client.end();
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
