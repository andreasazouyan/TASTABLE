/**
 * Regina's Table demo event on an existing database (no wipe, nothing else changes).
 *
 *   npm run demo:regina          # add the event if it's missing (keeps it as is if present)
 *   npm run demo:regina -- reset # clear demo reservations, back to 6 seats left
 *   npm run demo:regina -- rebuild # recreate the event and its seeded guest list from scratch
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { serverNow } from "../src/lib/clock";
import { REGINA_SLUG } from "../src/lib/domain/reginas-table";
import { resetReginasTableDemo } from "../src/server/services/reginas-table";
import { seedReginasTable } from "../prisma/seed-regina";

export async function ensureReginasTable(db: PrismaClient) {
  const exists = await db.experience.findUnique({ where: { slug: REGINA_SLUG }, select: { id: true } });
  if (exists) return { added: false };
  await seedReginasTable(db, serverNow());
  return { added: true };
}

async function main() {
  const mode = process.argv[2] ?? "add";
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL }) });
  try {
    if (mode === "reset") console.log("Regina's Table reset:", await resetReginasTableDemo(db));
    else if (mode === "rebuild") console.log("Regina's Table rebuilt:", await seedReginasTable(db, serverNow()));
    else console.log((await ensureReginasTable(db)).added ? "Regina's Table added." : "Regina's Table already present; nothing changed.");
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
