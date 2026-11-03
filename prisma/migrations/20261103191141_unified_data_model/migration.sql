-- Unified data model foundation (guest preferences, event content, reviews, cancellation, analytics).
--
-- SAFETY: this migration is strictly additive. It only creates types, tables, nullable or defaulted
-- columns, indexes, foreign keys and CHECK constraints, then BACKFILLS the new columns from existing
-- data. It never drops, renames or deletes anything, and never rewrites an existing value.
-- Every CHECK constraint is satisfied by existing rows (new columns are NULL/default or backfilled
-- with in-range values before the constraint is added).

-- CreateEnum
CREATE TYPE "AttendancePreference" AS ENUM ('SOLO', 'FRIENDS_OR_PARTNER', 'DEPENDS');

-- CreateEnum
CREATE TYPE "MenuStatus" AS ENUM ('FINAL', 'SUBJECT_TO_CHANGE', 'TO_BE_ANNOUNCED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PUBLISHED', 'UNDER_REVIEW', 'REMOVED');

-- CreateEnum
CREATE TYPE "ReviewReportStatus" AS ENUM ('OPEN', 'DISMISSED', 'ACTIONED');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "cancellationFeeCents" INTEGER,
ADD COLUMN     "cancellationFeePercent" INTEGER,
ADD COLUMN     "cancellationPolicyId" TEXT,
ADD COLUMN     "cancellationPolicyVersion" INTEGER;

-- AlterTable
ALTER TABLE "CancellationPolicy" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Experience" ADD COLUMN     "menuStatus" "MenuStatus" NOT NULL DEFAULT 'FINAL',
ADD COLUMN     "saveCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "GuestPreferences" ADD COLUMN     "attendancePreference" "AttendancePreference",
ADD COLUMN     "maxTravelMinutes" INTEGER,
ADD COLUMN     "preferredDays" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "preferredTimes" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "GuestFavoriteDish" (
    "id" TEXT NOT NULL,
    "preferencesId" TEXT NOT NULL,
    "dishKey" TEXT NOT NULL,
    "customName" TEXT,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestFavoriteDish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperienceDish" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "dishKey" TEXT NOT NULL,
    "customName" TEXT,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ExperienceDish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperienceMenuSection" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ExperienceMenuSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperienceMenuItem" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "dishKey" TEXT,
    "dietaryTags" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT,
    "imageAlt" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ExperienceMenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperienceItineraryStep" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "startOffsetMinutes" INTEGER NOT NULL,
    "durationMinutes" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "ExperienceItineraryStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "foodRating" INTEGER,
    "atmosphereRating" INTEGER,
    "organizationRating" INTEGER,
    "valueRating" INTEGER,
    "guestId" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "verifiedAttendance" BOOLEAN NOT NULL DEFAULT false,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PUBLISHED',
    "editedAt" TIMESTAMP(3),
    "isFictional" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewReport" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "reporterId" TEXT,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" "ReviewReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuestFavoriteDish_dishKey_idx" ON "GuestFavoriteDish"("dishKey");

-- CreateIndex
CREATE UNIQUE INDEX "GuestFavoriteDish_preferencesId_dishKey_key" ON "GuestFavoriteDish"("preferencesId", "dishKey");

-- CreateIndex
CREATE INDEX "ExperienceDish_dishKey_idx" ON "ExperienceDish"("dishKey");

-- CreateIndex
CREATE UNIQUE INDEX "ExperienceDish_experienceId_dishKey_key" ON "ExperienceDish"("experienceId", "dishKey");

-- CreateIndex
CREATE INDEX "ExperienceMenuSection_experienceId_sortOrder_idx" ON "ExperienceMenuSection"("experienceId", "sortOrder");

-- CreateIndex
CREATE INDEX "ExperienceMenuItem_sectionId_sortOrder_idx" ON "ExperienceMenuItem"("sectionId", "sortOrder");

-- CreateIndex
CREATE INDEX "ExperienceItineraryStep_experienceId_sortOrder_idx" ON "ExperienceItineraryStep"("experienceId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Review_bookingId_key" ON "Review"("bookingId");

-- CreateIndex
CREATE INDEX "Review_experienceId_status_createdAt_idx" ON "Review"("experienceId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Review_hostId_status_createdAt_idx" ON "Review"("hostId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Review_guestId_sessionId_key" ON "Review"("guestId", "sessionId");

-- CreateIndex
CREATE INDEX "ReviewReport_status_createdAt_idx" ON "ReviewReport"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewReport_reviewId_reporterId_key" ON "ReviewReport"("reviewId", "reporterId");

-- CreateIndex
CREATE INDEX "Experience_cuisine_idx" ON "Experience"("cuisine");

-- AddForeignKey
ALTER TABLE "GuestFavoriteDish" ADD CONSTRAINT "GuestFavoriteDish_preferencesId_fkey" FOREIGN KEY ("preferencesId") REFERENCES "GuestPreferences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienceDish" ADD CONSTRAINT "ExperienceDish_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienceMenuSection" ADD CONSTRAINT "ExperienceMenuSection_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienceMenuItem" ADD CONSTRAINT "ExperienceMenuItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ExperienceMenuSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienceItineraryStep" ADD CONSTRAINT "ExperienceItineraryStep_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_cancellationPolicyId_fkey" FOREIGN KEY ("cancellationPolicyId") REFERENCES "CancellationPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "GuestProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "HostProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ExperienceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ─── Data integrity checks (Prisma does not model CHECK constraints) ──────────────────────────
ALTER TABLE "Review" ADD CONSTRAINT "Review_rating_range" CHECK ("rating" BETWEEN 1 AND 5);
ALTER TABLE "Review" ADD CONSTRAINT "Review_body_not_blank" CHECK (length(btrim("body")) > 0);
ALTER TABLE "Review" ADD CONSTRAINT "Review_aspect_ratings_range" CHECK (
  ("foodRating" IS NULL OR "foodRating" BETWEEN 1 AND 5) AND
  ("atmosphereRating" IS NULL OR "atmosphereRating" BETWEEN 1 AND 5) AND
  ("organizationRating" IS NULL OR "organizationRating" BETWEEN 1 AND 5) AND
  ("valueRating" IS NULL OR "valueRating" BETWEEN 1 AND 5));
ALTER TABLE "GuestPreferences" ADD CONSTRAINT "GuestPreferences_maxTravelMinutes_allowed"
  CHECK ("maxTravelMinutes" IS NULL OR "maxTravelMinutes" IN (20, 30, 45));
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_cancellationFeePercent_range"
  CHECK ("cancellationFeePercent" IS NULL OR "cancellationFeePercent" BETWEEN 0 AND 100);
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_cancellationFeeCents_nonnegative"
  CHECK ("cancellationFeeCents" IS NULL OR "cancellationFeeCents" >= 0);
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_saveCount_nonnegative" CHECK ("saveCount" >= 0);
ALTER TABLE "GuestFavoriteDish" ADD CONSTRAINT "GuestFavoriteDish_custom_has_name"
  CHECK (NOT "isCustom" OR ("customName" IS NOT NULL AND "dishKey" LIKE 'custom:%'));
ALTER TABLE "ExperienceDish" ADD CONSTRAINT "ExperienceDish_custom_has_name"
  CHECK (NOT "isCustom" OR ("customName" IS NOT NULL AND "dishKey" LIKE 'custom:%'));
ALTER TABLE "ExperienceItineraryStep" ADD CONSTRAINT "ExperienceItineraryStep_offset_nonnegative"
  CHECK ("startOffsetMinutes" >= 0 AND ("durationMinutes" IS NULL OR "durationMinutes" > 0));

-- ─── Backfills (fill NEW columns from existing data; existing columns are untouched) ─────────

-- Unique savers per event.
UPDATE "Experience" e
SET "saveCount" = s.n
FROM (SELECT "experienceId", count(*)::int AS n FROM "SavedExperience" GROUP BY "experienceId") s
WHERE s."experienceId" = e."id";

-- Note: maxTravelMinutes, preferredDays, preferredTimes, attendancePreference and favorite dishes
-- are NOT backfilled. They are new questions; inventing answers from older values (e.g. converting
-- the legacy mile radius to minutes) would put words in guests' mouths.

-- Policy accepted at booking. Policies were never edited before versioning existed (host terms are
-- keyed by their values and upserted without updates), so every existing booking accepted
-- version 1 of its event's current policy. policySnapshot remains the verbatim record.
UPDATE "Booking" b
SET "cancellationPolicyId" = x."cancellationPolicyId", "cancellationPolicyVersion" = 1
FROM "ExperienceSession" s
JOIN "Experience" x ON x."id" = s."experienceId"
WHERE s."id" = b."sessionId";

-- Cancellation fee for bookings that were already cancelled. Guest cancellations retain
-- (ticket subtotal - ticket refund); host/system cancellations refund in full, so no fee.
UPDATE "Booking"
SET "cancellationFeeCents" = CASE
      WHEN "cancelledBy" = 'GUEST' THEN GREATEST("subtotalCents" - LEAST("refundAmountCents", "subtotalCents"), 0)
      ELSE 0 END,
    "cancellationFeePercent" = CASE
      WHEN "cancelledBy" = 'GUEST' AND "subtotalCents" > 0
        THEN ROUND(100.0 * GREATEST("subtotalCents" - LEAST("refundAmountCents", "subtotalCents"), 0) / "subtotalCents")::int
      ELSE 0 END
WHERE "status" = 'CANCELLED';

-- Structured menu: copy each legacy flat menu into a single "Menu" section. Every writer stores
-- this column with JSON.stringify, so it is valid JSON; non-array values are skipped.
INSERT INTO "ExperienceMenuSection" ("id", "experienceId", "title", "description", "sortOrder")
SELECT 'ms_' || e."id", e."id", 'Menu', '', 0
FROM "Experience" e
WHERE CASE WHEN e."menu" ~ '^\s*\[' THEN jsonb_array_length(e."menu"::jsonb) > 0 ELSE false END;

INSERT INTO "ExperienceMenuItem" ("id", "sectionId", "name", "description", "sortOrder")
SELECT 'mi_' || e."id" || '_' || (item.ord - 1), 'ms_' || e."id",
       COALESCE(item.value ->> 'title', ''), COALESCE(item.value ->> 'description', ''), (item.ord - 1)::int
FROM "Experience" e
JOIN "ExperienceMenuSection" ms ON ms."id" = 'ms_' || e."id"
CROSS JOIN LATERAL jsonb_array_elements(e."menu"::jsonb) WITH ORDINALITY AS item(value, ord)
WHERE jsonb_typeof(item.value) = 'object' AND COALESCE(item.value ->> 'title', '') <> '';
