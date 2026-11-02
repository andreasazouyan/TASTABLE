/**
 * Runs during the hosted build (see "vercel-build" in package.json):
 *   1. applies pending migrations, then
 *   2. seeds the FICTIONAL demo data only if the database is empty, or when TASTABLE_RESEED=true.
 * Bookings made on the live demo therefore survive ordinary redeploys.
 */
import "dotenv/config";

import { execSync } from "node:child_process";
import { Client } from "pg";

async function main() {
  const migrateUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!migrateUrl) throw new Error("DATABASE_URL is not set. Connect a Postgres database (for example Neon) first.");

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
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
