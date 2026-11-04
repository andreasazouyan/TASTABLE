-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('SCHEDULED', 'DISMISSED', 'CANCELLED');

-- AlterTable
ALTER TABLE "CancellationPolicy" ADD COLUMN     "lateFeePercent" INTEGER;

-- CreateTable
CREATE TABLE "BookingReminder" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'IN_APP',
    "remindAt" TIMESTAMP(3) NOT NULL,
    "status" "ReminderStatus" NOT NULL DEFAULT 'SCHEDULED',
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookingReminder_bookingId_key" ON "BookingReminder"("bookingId");

-- CreateIndex
CREATE INDEX "BookingReminder_status_remindAt_idx" ON "BookingReminder"("status", "remindAt");

-- AddForeignKey
ALTER TABLE "BookingReminder" ADD CONSTRAINT "BookingReminder_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Data (additive): Tastable's standard late-fee terms for NEW bookings. Existing bookings keep the
-- terms stored in their own policySnapshot, so nothing about them changes.
INSERT INTO "CancellationPolicy" ("id", "key", "hostId", "name", "summary", "fullRefundHours", "partialRefundHours", "partialRefundPercent", "version", "lateFeePercent", "createdAt", "updatedAt")
SELECT 'pol_late_fee_24h_25', 'LATE_FEE_24H_25', NULL, 'Tastable standard (24 hours)',
       'Free cancellation until 24 hours before the start. Cancellations made less than 24 hours before the event are subject to a fee of 25% of the ticket subtotal.',
       24, NULL, 0, 1, 25, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "CancellationPolicy" WHERE "hostId" IS NULL AND "key" = 'LATE_FEE_24H_25');

-- In-app reminders (24 hours before) for confirmed bookings of upcoming, scheduled sessions.
INSERT INTO "BookingReminder" ("id", "bookingId", "channel", "remindAt", "status", "createdAt", "updatedAt")
SELECT 'rem_' || b."id", b."id", 'IN_APP', s."startsAt" - INTERVAL '24 hours', 'SCHEDULED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Booking" b JOIN "ExperienceSession" s ON s."id" = b."sessionId"
WHERE b."status" = 'CONFIRMED' AND s."status" = 'SCHEDULED' AND s."startsAt" > CURRENT_TIMESTAMP
  AND NOT EXISTS (SELECT 1 FROM "BookingReminder" r WHERE r."bookingId" = b."id");
