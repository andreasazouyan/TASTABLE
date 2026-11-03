/**
 * Read-only database integrity checks for the unified data model.
 *
 *   npm run db:check            # against DATABASE_URL
 *
 * Exits 1 when any check fails. Never writes: fix problems with a migration or the services.
 */
import "dotenv/config";

import { Client } from "pg";

const CHECKS: { name: string; sql: string }[] = [
  {
    name: "Experience.saveCount matches unique savers",
    sql: `SELECT e.id FROM "Experience" e LEFT JOIN (SELECT "experienceId", count(*)::int n FROM "SavedExperience" GROUP BY 1) s ON s."experienceId" = e.id WHERE e."saveCount" <> COALESCE(s.n, 0)`,
  },
  {
    name: "Every booking records the accepted cancellation policy version",
    sql: `SELECT id FROM "Booking" WHERE "cancellationPolicyVersion" IS NULL OR "cancellationPolicyId" IS NULL`,
  },
  {
    name: "Cancelled bookings record cancellation time, refund and fee",
    sql: `SELECT id FROM "Booking" WHERE status = 'CANCELLED' AND ("cancelledAt" IS NULL OR "cancellationFeeCents" IS NULL OR "cancellationFeePercent" IS NULL)`,
  },
  {
    name: "Refund + fee never exceed what was paid",
    sql: `SELECT id FROM "Booking" WHERE "refundAmountCents" > "totalPriceCents" OR COALESCE("cancellationFeeCents", 0) > "subtotalCents"`,
  },
  {
    name: "Reviews point at the booking's own guest, session, event and host",
    sql: `SELECT r.id FROM "Review" r JOIN "Booking" b ON b.id = r."bookingId" JOIN "ExperienceSession" s ON s.id = b."sessionId" JOIN "Experience" x ON x.id = s."experienceId"
          WHERE r."guestId" <> b."guestId" OR r."sessionId" <> s.id OR r."experienceId" <> x.id OR r."hostId" <> x."hostId"`,
  },
  {
    name: "Verified reviews come from checked-in, non-cancelled bookings",
    sql: `SELECT r.id FROM "Review" r JOIN "Booking" b ON b.id = r."bookingId"
          WHERE r."verifiedAttendance" AND (b.status = 'CANCELLED' OR NOT EXISTS (SELECT 1 FROM "BookingTicket" t WHERE t."bookingId" = b.id AND t.status = 'CHECKED_IN'))`,
  },
  {
    name: "No duplicate images within an event",
    sql: `SELECT "experienceId" FROM "ExperiencePhoto" GROUP BY "experienceId", url HAVING count(*) > 1`,
  },
  {
    name: "Itinerary steps are in chronological order",
    sql: `SELECT a.id FROM "ExperienceItineraryStep" a JOIN "ExperienceItineraryStep" b ON b."experienceId" = a."experienceId" AND b."sortOrder" = a."sortOrder" + 1
          WHERE b."startOffsetMinutes" < a."startOffsetMinutes" + COALESCE(a."durationMinutes", 0)`,
  },
  {
    name: "Preference lists only hold known day and time-slot keys",
    sql: `SELECT p.id FROM "GuestPreferences" p
          WHERE EXISTS (SELECT 1 FROM unnest(string_to_array(NULLIF(p."preferredDays", ''), ',')) d WHERE d NOT IN ('SUN','MON','TUE','WED','THU','FRI','SAT'))
             OR EXISTS (SELECT 1 FROM unnest(string_to_array(NULLIF(p."preferredTimes", ''), ',')) t WHERE t NOT IN ('12-14','14-16','16-18','18-20','20-22','22-24'))`,
  },
  {
    name: "At most three preferred experience categories",
    sql: `SELECT id FROM "GuestPreferences" WHERE cardinality(string_to_array(NULLIF("favoriteCategories", ''), ',')) > 3`,
  },
];

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  const client = new Client({ connectionString: url });
  await client.connect();
  let failed = 0;
  try {
    for (const check of CHECKS) {
      const { rows } = await client.query(check.sql);
      if (rows.length) failed++;
      console.log(`${rows.length ? "FAIL" : "ok  "}  ${check.name}${rows.length ? ` (${rows.length} rows, e.g. ${JSON.stringify(rows[0])})` : ""}`);
    }
  } finally {
    await client.end();
  }
  if (failed) {
    console.error(`\n${failed} check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll database checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
