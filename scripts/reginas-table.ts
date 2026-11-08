/**
 * Tastable Team's Entrepreneurship Class Supper (demo event) on an existing database (no wipe, nothing else changes).
 *
 *   npm run demo:regina          # add the event if it's missing, or update its date, title and copy in place
 *   npm run demo:regina -- reset # clear demo reservations, back to 6 seats left
 *   npm run demo:regina -- rebuild # recreate the event and its seeded guest list from scratch
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { reminderTime } from "../src/lib/booking/cancellation";
import { nyDateTime, serverNow } from "../src/lib/clock";
import { REGINA_DATE, REGINA_DURATION_MINUTES, REGINA_HOST_SLUG, REGINA_SESSION_ID, REGINA_SLUG, REGINA_START, REGINA_TITLE } from "../src/lib/domain/reginas-table";
import { resetReginasTableDemo } from "../src/server/services/reginas-table";
import { REGINA_DESCRIPTION, REGINA_HIGHLIGHTS, REGINA_HOST_DATA, REGINA_INCLUSIONS, seedReginasTable } from "../prisma/seed-regina";

export async function ensureReginasTable(db: PrismaClient) {
  const exists = await db.experience.findUnique({ where: { slug: REGINA_SLUG }, select: { id: true } });
  if (exists) {
    // Update the existing event in place (date, title and copy); its reservations are kept and
    // their in-app reminders move with the date, as on any reschedule.
    await db.experience.update({
      where: { id: exists.id },
      data: { title: REGINA_TITLE, description: REGINA_DESCRIPTION, highlights: JSON.stringify(REGINA_HIGHLIGHTS), inclusions: JSON.stringify(REGINA_INCLUSIONS) },
    });
    const startsAt = nyDateTime(REGINA_DATE, REGINA_START.hour, REGINA_START.minute);
    await db.experienceSession.update({ where: { id: REGINA_SESSION_ID }, data: { startsAt, endsAt: new Date(startsAt.getTime() + REGINA_DURATION_MINUTES * 60_000) } });
    await db.bookingReminder.updateMany({ where: { booking: { sessionId: REGINA_SESSION_ID }, status: "SCHEDULED" }, data: { remindAt: reminderTime(startsAt) } });
    await db.hostProfile.updateMany({ where: { slug: REGINA_HOST_SLUG }, data: REGINA_HOST_DATA });
    await db.user.updateMany({ where: { id: `usr_${REGINA_HOST_SLUG}` }, data: { name: REGINA_HOST_DATA.displayName } });
    await db.guestProfile.updateMany({ where: { id: `gst_${REGINA_HOST_SLUG}` }, data: { displayName: REGINA_HOST_DATA.displayName } });
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
    else console.log((await ensureReginasTable(db)).added ? "Regina's event added." : "Regina's event already present; date, title, host and copy updated.");
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
