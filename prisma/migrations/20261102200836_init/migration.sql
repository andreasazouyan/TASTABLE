-- CreateEnum
CREATE TYPE "ExperienceCategory" AS ENUM ('SUPPER_CLUB_PRIVATE_DINING', 'COOKING_CLASS_WORKSHOP', 'POPUP_EXCLUSIVE', 'SOCIAL_CULINARY');

-- CreateEnum
CREATE TYPE "HostType" AS ENUM ('PRIVATE_CHEF', 'CREATOR_INFLUENCER', 'CULINARY_PROFESSIONAL', 'SUPPER_CLUB_ORGANIZER', 'OTHER');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('GUEST', 'HOST', 'ADMIN');

-- CreateEnum
CREATE TYPE "SocialAtmosphere" AS ENUM ('MEET_NEW_PEOPLE', 'BRING_YOUR_PEOPLE', 'EITHER_WAY');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'CANCELLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "VenueRequestStatus" AS ENUM ('SUBMITTED', 'IN_REVIEW', 'CLOSED');

-- CreateEnum
CREATE TYPE "EventFormat" AS ENUM ('SEATED_DINNER', 'CHEFS_TABLE', 'HANDS_ON_CLASS', 'DEMONSTRATION', 'TASTING', 'STANDING_RECEPTION', 'WALKING_TOUR', 'BRUNCH');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('SCHEDULED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "VenueType" AS ENUM ('RESTAURANT', 'PRIVATE_HOME', 'LOFT', 'ROOFTOP', 'STUDIO_KITCHEN', 'GALLERY', 'BAR', 'OUTDOOR', 'SECRET_LOCATION');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "CancellationActor" AS ENUM ('GUEST', 'HOST', 'SYSTEM');

-- CreateEnum
CREATE TYPE "SimulatedPaymentStatus" AS ENUM ('SIMULATED_PAID', 'SIMULATED_FAILED', 'SIMULATED_REFUNDED', 'SIMULATED_PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('VALID', 'CHECKED_IN', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'NOTIFIED', 'CONVERTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('INGREDIENTS', 'BEVERAGES', 'VENUE', 'STAFF', 'EQUIPMENT', 'MARKETING', 'OTHER');

-- CreateEnum
CREATE TYPE "CalendarVisibility" AS ENUM ('PRIVATE', 'FRIENDS', 'PUBLIC');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'GUEST',
    "avatarUrl" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "homeNeighborhood" TEXT,
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestPreferences" (
    "id" TEXT NOT NULL,
    "guestProfileId" TEXT NOT NULL,
    "locationKey" TEXT NOT NULL DEFAULT 'nyc',
    "travelRadiusMiles" INTEGER,
    "favoriteCuisines" TEXT NOT NULL DEFAULT '',
    "favoriteCategories" TEXT NOT NULL DEFAULT '',
    "motivations" TEXT NOT NULL DEFAULT '',
    "onboardingCompletedAt" TIMESTAMP(3),
    "onboardingSkippedAt" TIMESTAMP(3),
    "dietaryRestrictions" TEXT NOT NULL DEFAULT '',
    "preferredNeighborhoods" TEXT NOT NULL DEFAULT '',
    "socialAtmosphere" "SocialAtmosphere",
    "maxBudgetCents" INTEGER,
    "followedHosts" TEXT NOT NULL DEFAULT '',
    "emailNewExperiences" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarSharingPreference" (
    "id" TEXT NOT NULL,
    "guestProfileId" TEXT NOT NULL,
    "visibility" "CalendarVisibility" NOT NULL DEFAULT 'PRIVATE',
    "showExperienceTitles" BOOLEAN NOT NULL DEFAULT true,
    "icalFeedEnabled" BOOLEAN NOT NULL DEFAULT false,
    "shareToken" TEXT,
    "sharedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarSharingPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarShareItem" (
    "id" TEXT NOT NULL,
    "preferenceId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarShareItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "hostType" "HostType" NOT NULL,
    "tagline" TEXT NOT NULL,
    "background" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "homeNeighborhood" TEXT,
    "cuisineExpertise" TEXT NOT NULL DEFAULT '',
    "credentials" TEXT NOT NULL DEFAULT '',
    "profilePhotoUrl" TEXT,
    "onboardingCompletedAt" TIMESTAMP(3),
    "instagramHandle" TEXT,
    "tiktokHandle" TEXT,
    "followerCount" INTEGER NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "isFictional" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venue" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "VenueType" NOT NULL,
    "neighborhood" TEXT NOT NULL,
    "borough" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'New York',
    "addressLine" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "maxCapacity" INTEGER NOT NULL,
    "isSecretLocation" BOOLEAN NOT NULL DEFAULT false,
    "isPlaceholder" BOOLEAN NOT NULL DEFAULT false,
    "accessibilityNotes" TEXT,
    "managedByHostId" TEXT,
    "isFictional" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CancellationPolicy" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "hostId" TEXT,
    "name" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "fullRefundHours" INTEGER NOT NULL,
    "partialRefundHours" INTEGER,
    "partialRefundPercent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CancellationPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Experience" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ExperienceCategory" NOT NULL,
    "cuisine" TEXT NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '',
    "dietaryOptions" TEXT NOT NULL DEFAULT '',
    "socialAtmosphere" "SocialAtmosphere" NOT NULL DEFAULT 'EITHER_WAY',
    "format" "EventFormat" NOT NULL,
    "occasions" TEXT NOT NULL DEFAULT '',
    "highlights" TEXT NOT NULL DEFAULT '[]',
    "menu" TEXT NOT NULL DEFAULT '[]',
    "inclusions" TEXT NOT NULL DEFAULT '[]',
    "status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "hostId" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "cancellationPolicyId" TEXT NOT NULL,
    "ticketPriceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "durationMinutes" INTEGER NOT NULL,
    "defaultCapacity" INTEGER NOT NULL,
    "minimumAge" INTEGER,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "isFictional" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Experience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperiencePhoto" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "credit" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperiencePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperienceSession" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "seatsReserved" INTEGER NOT NULL DEFAULT 0,
    "priceOverrideCents" INTEGER,
    "status" "SessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExperienceSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "ticketCount" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "subtotalCents" INTEGER NOT NULL,
    "serviceFeeCents" INTEGER NOT NULL,
    "totalPriceCents" INTEGER NOT NULL,
    "refundAmountCents" INTEGER NOT NULL DEFAULT 0,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "dietaryRequirements" TEXT,
    "policyAcknowledgedAt" TIMESTAMP(3) NOT NULL,
    "policySnapshot" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" "CancellationActor",
    "cancellationReason" TEXT,
    "paymentStatus" "SimulatedPaymentStatus" NOT NULL,
    "paymentReference" TEXT NOT NULL,
    "isFictional" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingTicket" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "attendeeName" TEXT,
    "attendeeEmail" TEXT,
    "dietaryNotes" TEXT,
    "status" "TicketStatus" NOT NULL DEFAULT 'VALID',
    "checkedInAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedExperience" (
    "guestId" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedExperience_pkey" PRIMARY KEY ("guestId","experienceId")
);

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "partySize" INTEGER NOT NULL DEFAULT 1,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventInvitation" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "bookingId" TEXT,
    "inviteeName" TEXT,
    "inviteeEmail" TEXT NOT NULL,
    "inviteeId" TEXT,
    "message" TEXT,
    "token" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventExpense" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "sessionId" TEXT,
    "category" "ExpenseCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "incurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenueAssistanceRequest" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "neighborhoods" TEXT NOT NULL DEFAULT '',
    "guestCount" INTEGER NOT NULL,
    "preferredDates" TEXT NOT NULL,
    "budgetCents" INTEGER,
    "needsKitchen" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "status" "VenueRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VenueAssistanceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperienceDailyStat" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ExperienceDailyStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "GuestProfile_userId_key" ON "GuestProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GuestPreferences_guestProfileId_key" ON "GuestPreferences"("guestProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarSharingPreference_guestProfileId_key" ON "CalendarSharingPreference"("guestProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarSharingPreference_shareToken_key" ON "CalendarSharingPreference"("shareToken");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarShareItem_preferenceId_sessionId_key" ON "CalendarShareItem"("preferenceId", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "HostProfile_userId_key" ON "HostProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "HostProfile_slug_key" ON "HostProfile"("slug");

-- CreateIndex
CREATE INDEX "HostProfile_hostType_idx" ON "HostProfile"("hostType");

-- CreateIndex
CREATE UNIQUE INDEX "Venue_slug_key" ON "Venue"("slug");

-- CreateIndex
CREATE INDEX "Venue_neighborhood_idx" ON "Venue"("neighborhood");

-- CreateIndex
CREATE UNIQUE INDEX "CancellationPolicy_hostId_key_key" ON "CancellationPolicy"("hostId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Experience_slug_key" ON "Experience"("slug");

-- CreateIndex
CREATE INDEX "Experience_category_status_idx" ON "Experience"("category", "status");

-- CreateIndex
CREATE INDEX "Experience_status_featured_idx" ON "Experience"("status", "featured");

-- CreateIndex
CREATE INDEX "Experience_hostId_idx" ON "Experience"("hostId");

-- CreateIndex
CREATE INDEX "Experience_venueId_idx" ON "Experience"("venueId");

-- CreateIndex
CREATE INDEX "ExperiencePhoto_experienceId_sortOrder_idx" ON "ExperiencePhoto"("experienceId", "sortOrder");

-- CreateIndex
CREATE INDEX "ExperienceSession_startsAt_status_idx" ON "ExperienceSession"("startsAt", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ExperienceSession_experienceId_startsAt_key" ON "ExperienceSession"("experienceId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_reference_key" ON "Booking"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_paymentReference_key" ON "Booking"("paymentReference");

-- CreateIndex
CREATE INDEX "Booking_guestId_status_idx" ON "Booking"("guestId", "status");

-- CreateIndex
CREATE INDEX "Booking_sessionId_status_idx" ON "Booking"("sessionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BookingTicket_code_key" ON "BookingTicket"("code");

-- CreateIndex
CREATE INDEX "BookingTicket_bookingId_idx" ON "BookingTicket"("bookingId");

-- CreateIndex
CREATE INDEX "SavedExperience_experienceId_idx" ON "SavedExperience"("experienceId");

-- CreateIndex
CREATE INDEX "WaitlistEntry_sessionId_status_createdAt_idx" ON "WaitlistEntry"("sessionId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistEntry_sessionId_guestId_key" ON "WaitlistEntry"("sessionId", "guestId");

-- CreateIndex
CREATE UNIQUE INDEX "EventInvitation_token_key" ON "EventInvitation"("token");

-- CreateIndex
CREATE INDEX "EventInvitation_inviteeEmail_idx" ON "EventInvitation"("inviteeEmail");

-- CreateIndex
CREATE UNIQUE INDEX "EventInvitation_sessionId_inviterId_inviteeEmail_key" ON "EventInvitation"("sessionId", "inviterId", "inviteeEmail");

-- CreateIndex
CREATE INDEX "EventExpense_hostId_incurredAt_idx" ON "EventExpense"("hostId", "incurredAt");

-- CreateIndex
CREATE INDEX "EventExpense_experienceId_idx" ON "EventExpense"("experienceId");

-- CreateIndex
CREATE INDEX "VenueAssistanceRequest_hostId_idx" ON "VenueAssistanceRequest"("hostId");

-- CreateIndex
CREATE UNIQUE INDEX "ExperienceDailyStat_experienceId_date_key" ON "ExperienceDailyStat"("experienceId", "date");

-- AddForeignKey
ALTER TABLE "GuestProfile" ADD CONSTRAINT "GuestProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestPreferences" ADD CONSTRAINT "GuestPreferences_guestProfileId_fkey" FOREIGN KEY ("guestProfileId") REFERENCES "GuestProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarSharingPreference" ADD CONSTRAINT "CalendarSharingPreference_guestProfileId_fkey" FOREIGN KEY ("guestProfileId") REFERENCES "GuestProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarShareItem" ADD CONSTRAINT "CalendarShareItem_preferenceId_fkey" FOREIGN KEY ("preferenceId") REFERENCES "CalendarSharingPreference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarShareItem" ADD CONSTRAINT "CalendarShareItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ExperienceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostProfile" ADD CONSTRAINT "HostProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venue" ADD CONSTRAINT "Venue_managedByHostId_fkey" FOREIGN KEY ("managedByHostId") REFERENCES "HostProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CancellationPolicy" ADD CONSTRAINT "CancellationPolicy_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "HostProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "HostProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_cancellationPolicyId_fkey" FOREIGN KEY ("cancellationPolicyId") REFERENCES "CancellationPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperiencePhoto" ADD CONSTRAINT "ExperiencePhoto_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienceSession" ADD CONSTRAINT "ExperienceSession_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "GuestProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ExperienceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingTicket" ADD CONSTRAINT "BookingTicket_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedExperience" ADD CONSTRAINT "SavedExperience_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "GuestProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedExperience" ADD CONSTRAINT "SavedExperience_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ExperienceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "GuestProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventInvitation" ADD CONSTRAINT "EventInvitation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ExperienceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventInvitation" ADD CONSTRAINT "EventInvitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "GuestProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventInvitation" ADD CONSTRAINT "EventInvitation_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventInvitation" ADD CONSTRAINT "EventInvitation_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "GuestProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventExpense" ADD CONSTRAINT "EventExpense_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "HostProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventExpense" ADD CONSTRAINT "EventExpense_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventExpense" ADD CONSTRAINT "EventExpense_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ExperienceSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueAssistanceRequest" ADD CONSTRAINT "VenueAssistanceRequest_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "HostProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienceDailyStat" ADD CONSTRAINT "ExperienceDailyStat_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;
