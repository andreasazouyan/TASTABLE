/**
 * Tastable Team's Entrepreneurship Class Supper: the one-time, complimentary supper club for the live MVP demo.
 *
 * Unlike the fictional catalog, this event is real-world (a real venue on a fixed date), so it is
 * not marked as a fictional sample. It is added by its own idempotent step, without the seed's
 * random number generator, so the rest of the demo catalog stays exactly as it was.
 *
 *   - Fresh seed: prisma/seed.ts calls seedReginasTable() at the end.
 *   - Existing database: `npm run demo:regina` (or the hosted build) adds it if it's missing.
 *
 * One session (Monday, November 23, 2026, 8:30–11:00 PM New York time), 15 seats, 9 already
 * taken by seeded guests, so 6 seats are left.
 */
import type { PrismaClient } from "../src/generated/prisma/client";
import { quote } from "../src/lib/booking/pricing";
import { LATE_FEE_POLICY_KEY, reminderTime, termsFromPolicy, termsSnapshot } from "../src/lib/booking/cancellation";
import { nyDateTime } from "../src/lib/clock";
import { EVENT_IMAGE_CREDIT, eventImagesFor } from "../src/lib/domain/event-images";
import { legacyMenuFromSections, type MenuSectionInput } from "../src/lib/domain/event-content";
import {
  REGINA_ADDRESS,
  REGINA_CAPACITY,
  REGINA_DATE,
  REGINA_DURATION_MINUTES,
  REGINA_HOST_NAME,
  REGINA_HOST_SLUG,
  REGINA_MAINS,
  REGINA_SEEDED_BOOKING_PREFIX,
  REGINA_SESSION_ID,
  REGINA_SLUG,
  REGINA_START,
  REGINA_TITLE,
} from "../src/lib/domain/reginas-table";

const EXP_ID = `exp_${REGINA_SLUG}`;
const HOST_KEY = REGINA_HOST_SLUG;
const VENUE_ID = "ven_international-house-nyc";

const MENU = [
  { title: "Starter", items: [{ name: "Fresh green salad", description: "With tomatoes and cucumber", dietaryTags: ["vegetarian", "vegan", "gluten-free"] }] },
  {
    title: "Main",
    description: "Choose one for each guest when you reserve.",
    items: [
      { name: REGINA_MAINS[0].label, description: "", dietaryTags: [] },
      { name: REGINA_MAINS[1].label, description: "", dietaryTags: ["vegetarian"] },
    ],
  },
  { title: "Dessert", items: [{ name: "Chocolate cake", description: "", dietaryTags: ["vegetarian"] }] },
];

/** Kept here so existing databases can be updated in place (scripts/reginas-table.ts). */
/** Andréas's copy (Nov 6): two paragraphs, shown with their line break. */
export const REGINA_DESCRIPTION =
  "Regina and the Tastable team are excited to invite you to International House for a fun evening of food, conversation, and connection!\n\n" +
  "As part of our Entrepreneurship class, we're testing Tastable, our new platform for discovering unique culinary experiences. Join us for a homemade three-course dinner, meet new people, and help us bring our concept to life!";
export const REGINA_HIGHLIGHTS = [
  "Just 15 guests around one table",
  "Homemade three-course dinner",
  "Only 3 spots available — and you can bring a +1!",
  "Free to attend — a special event to test the Tastable experience!",
];
/** The host shown on cards and the event page: the Tastable Team (Regina cooks). */
export const REGINA_HOST_DATA = {
  displayName: REGINA_HOST_NAME,
  hostType: "SUPPER_CLUB_ORGANIZER" as const,
  tagline: "Homemade dinners that bring people together",
  background: "The team behind Tastable, hosting a supper club for our Entrepreneurship class",
  bio: "The Tastable Team hosts a homemade three-course dinner, cooked by Regina, for a small table of guests, with plenty of time to meet new people.",
  homeNeighborhood: "morningside-heights",
  cuisineExpertise: "italian",
  credentials: "",
  instagramHandle: null,
  followerCount: 0,
  verified: false,
  isFictional: false,
};
export const REGINA_INCLUSIONS = ["Welcome drinks", "Homemade three-course dinner", "A main course of your choice for each guest"];

const SCHEDULE = [
  { startOffsetMinutes: 0, durationMinutes: 30, title: "Welcome drinks and mingling", description: "Arrive, grab a drink and meet the other guests." },
  { startOffsetMinutes: 30, durationMinutes: 90, title: "Three-course dinner", description: "Salad, your choice of pasta, and chocolate cake." },
  { startOffsetMinutes: 120, durationMinutes: 30, title: "Socializing and conversation", description: "Stay a while: more time to talk around the table." },
];

/** Seeded guests holding the 9 taken seats: four pairs and one solo guest (all fictional demo guests). */
const SEEDED_PARTIES: { guestKey: string; mains: (0 | 1)[] }[] = [
  { guestKey: "bg-2", mains: [0, 1] },
  { guestKey: "bg-6", mains: [1, 1] },
  { guestKey: "bg-11", mains: [0, 0] },
  { guestKey: "bg-17", mains: [1, 0] },
  { guestKey: "bg-23", mains: [1] },
];

export async function seedReginasTable(db: PrismaClient, now: Date) {
  // Idempotent: rebuild the event from scratch (sessions, bookings, menu and photos cascade).
  await db.experience.deleteMany({ where: { slug: REGINA_SLUG } });

  const latePolicy = await db.cancellationPolicy.findFirst({ where: { hostId: null, key: LATE_FEE_POLICY_KEY } });
  const eventPolicy = await db.cancellationPolicy.findFirst({ where: { hostId: null, key: "FLEXIBLE_24H" } });
  if (!latePolicy || !eventPolicy) throw new Error("Seed the platform cancellation policies before Regina's event.");

  await db.user.upsert({
    where: { id: `usr_${HOST_KEY}` },
    update: { name: REGINA_HOST_NAME },
    create: {
      id: `usr_${HOST_KEY}`,
      name: REGINA_HOST_NAME,
      email: "regina.host@example.com",
      role: "HOST",
      isDemo: true,
      guestProfile: { create: { id: `gst_${HOST_KEY}`, displayName: REGINA_HOST_NAME, homeNeighborhood: "morningside-heights" } },
    },
  });
  await db.hostProfile.upsert({
    where: { id: `hst_${HOST_KEY}` },
    update: REGINA_HOST_DATA,
    create: { id: `hst_${HOST_KEY}`, userId: `usr_${HOST_KEY}`, slug: HOST_KEY, ...REGINA_HOST_DATA, onboardingCompletedAt: now },
  });

  const venueData = {
    name: "International House New York (I-House)",
    // Closest existing venue type: I-House is a residence with shared dining and event spaces.
    type: "PRIVATE_HOME" as const,
    neighborhood: "Morningside Heights",
    borough: "Manhattan",
    addressLine: REGINA_ADDRESS,
    latitude: 40.8127,
    longitude: -73.9632,
    maxCapacity: REGINA_CAPACITY,
    isSecretLocation: false,
    accessibilityNotes: null,
    managedByHostId: null,
    isFictional: false,
  };
  await db.venue.upsert({ where: { id: VENUE_ID }, update: venueData, create: { id: VENUE_ID, slug: "international-house-nyc", ...venueData } });

  const menuSections = MENU.map((s) => ({ title: s.title, description: s.description ?? "", items: s.items }));
  await db.experience.create({
    data: {
      id: EXP_ID,
      slug: REGINA_SLUG,
      title: REGINA_TITLE,
      summary: "A homemade three-course dinner for just 15 guests at International House New York.",
      description: REGINA_DESCRIPTION,
      category: "SUPPER_CLUB_PRIVATE_DINING",
      cuisine: "italian",
      tags: "supper club,homemade,meet people,one night only",
      dietaryOptions: "vegetarian",
      socialAtmosphere: "MEET_NEW_PEOPLE",
      format: "SEATED_DINNER",
      occasions: "MEET_NEW_PEOPLE,BRING_A_FRIEND",
      highlights: JSON.stringify(REGINA_HIGHLIGHTS),
      menu: JSON.stringify(legacyMenuFromSections(menuSections as MenuSectionInput[])),
      inclusions: JSON.stringify(REGINA_INCLUSIONS),
      status: "PUBLISHED",
      publishedAt: new Date(now.getTime() - 86_400_000),
      hostId: `hst_${HOST_KEY}`,
      venueId: VENUE_ID,
      cancellationPolicyId: eventPolicy.id,
      ticketPriceCents: 0,
      durationMinutes: REGINA_DURATION_MINUTES,
      defaultCapacity: REGINA_CAPACITY,
      featured: false,
      menuStatus: "FINAL",
      isFictional: false,
      photos: { create: eventImagesFor(REGINA_SLUG).map((p, i) => ({ ...p, credit: EVENT_IMAGE_CREDIT, sortOrder: i })) },
      menuSections: {
        create: menuSections.map((s, i) => ({
          title: s.title,
          description: s.description,
          sortOrder: i,
          items: { create: s.items.map((it, j) => ({ name: it.name, description: it.description, dietaryTags: it.dietaryTags.join(","), sortOrder: j })) },
        })),
      },
      itinerary: { create: SCHEDULE.map((s, i) => ({ ...s, sortOrder: i })) },
      featuredDishes: { create: [{ dishKey: "pasta", sortOrder: 0 }] },
    },
  });

  const startsAt = nyDateTime(REGINA_DATE, REGINA_START.hour, REGINA_START.minute);
  await db.experienceSession.create({
    data: {
      id: REGINA_SESSION_ID,
      experienceId: EXP_ID,
      startsAt,
      endsAt: new Date(startsAt.getTime() + REGINA_DURATION_MINUTES * 60_000),
      capacity: REGINA_CAPACITY,
      seatsReserved: 0,
      status: startsAt > now ? "SCHEDULED" : "COMPLETED",
      createdAt: new Date(now.getTime() - 86_400_000),
    },
  });

  // Seeded guest list (9 seats). Ids carry REGINA_SEEDED_BOOKING_PREFIX so the reset keeps them.
  let reserved = 0;
  for (const [n, party] of SEEDED_PARTIES.entries()) {
    const guest = await db.guestProfile.findUnique({ where: { id: `gst_${party.guestKey}` }, include: { user: true } });
    if (!guest) throw new Error(`Seed guest ${party.guestKey} is missing.`);
    const price = quote(0, party.mains.length);
    const id = `${REGINA_SEEDED_BOOKING_PREFIX}${n + 1}`;
    const createdAt = new Date(now.getTime() - (n + 2) * 86_400_000);
    await db.booking.create({
      data: {
        id,
        reference: `TBL-RGN00${n + 1}`,
        guestId: guest.id,
        sessionId: REGINA_SESSION_ID,
        status: "CONFIRMED",
        ticketCount: price.ticketCount,
        unitPriceCents: 0,
        subtotalCents: 0,
        serviceFeeCents: 0,
        totalPriceCents: 0,
        contactName: guest.user.name,
        contactEmail: guest.user.email,
        policyAcknowledgedAt: createdAt,
        policySnapshot: termsSnapshot(termsFromPolicy(latePolicy)),
        cancellationPolicyId: latePolicy.id,
        cancellationPolicyVersion: latePolicy.version,
        paymentStatus: "SIMULATED_PAID",
        paymentReference: `sim_regina_seed_${n + 1}`,
        isFictional: true,
        createdAt,
        tickets: {
          create: party.mains.map((m, i) => ({
            code: `TKT-RGNA-${n + 1}${i}`,
            attendeeName: i === 0 ? guest.user.name : null,
            mealChoice: REGINA_MAINS[m].label,
          })),
        },
        reminder: { create: { id: `rem_${id}`, remindAt: reminderTime(startsAt), createdAt } },
      },
    });
    reserved += price.ticketCount;
  }
  await db.experienceSession.update({ where: { id: REGINA_SESSION_ID }, data: { seatsReserved: reserved } });
  return { experience: REGINA_SLUG, startsAt: startsAt.toISOString(), capacity: REGINA_CAPACITY, seatsReserved: reserved };
}
