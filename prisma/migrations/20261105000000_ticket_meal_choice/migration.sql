-- Additive: per-guest main course choice (nullable, no backfill).
ALTER TABLE "BookingTicket" ADD COLUMN "mealChoice" TEXT;
