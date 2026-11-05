/**
 * Regina's Entrepreneurship Class Supper (demo event) on an existing database (no wipe, nothing else changes).
 *
 *   npm run demo:regina          # add the event if it's missing, or update its title and copy in place
 *   npm run demo:regina -- reset # clear demo reservations, back to 6 seats left
 *   npm run demo:regina -- rebuild # recreate the event and its seeded guest list from scratch
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { serverNow } from "../src/lib/clock";
import { REGINA_SLUG, REGINA_TITLE } from "../src/lib/domain/reginas-table";
import { resetReginasTableDemo } from "../src/server/services/reginas-table";
import { REGINA_INCLUSIONS, seedReginasTable } from "../prisma/seed-regina";

export async function ensureReginasTable(db: PrismaClient) {
  const exists = await db.experience.findUnique({ where: { slug: REGINA_SLUG }, select: { id: true } });
  if (exists) {
    // Update the existing event in place (title and copy only); its reservations are kept.
    await db.experience.update({ where: { id: exists.id }, data: { title: REGINA_TITLE, inclusions: JSON.stringify(REGINA_INCLUSIONS) } });
    await db.hostProfile.updateMany({ where: { slug: "regina" }, data: { background: "Food creator and host of intimate supper clubs" } });
    return { added: false };
  }
  await seedReginasTable(db, serverNow());
  return { added: true };
}

async function main() {
  const mode = process.argv[2] ?? "add";
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL }) });
  try {
    if (mode === "reset") console.log("Regina's event reset:", await resetReginasTableDemo(db));
    else if (mode === "rebuild") console.log("Regina's event rebuilt:", await seedReginasTable(db, serverNow()));
    else console.log((await ensureReginasTable(db)).added ? "Regina's event added." : "Regina's event already present; title and copy updated.");
  } finally {
    await db.$disconnect();
  }
}

if (process.argv[1]?.endsWith("reginas-table.ts")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
