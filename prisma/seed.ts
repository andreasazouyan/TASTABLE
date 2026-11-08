/**
 * Deterministic seed for Tastable. Wipes every table, then rebuilds FICTIONAL NYC demo data.
 *
 *   npm run db:seed     # reseed the current database
 *   npm run demo:reset  # re-apply migrations from scratch, then seed
 *
 * Determinism: a fixed PRNG drives every choice, and IDs/codes are derived from counters.
 * Dates are generated relative to "today" in New York so sessions are always upcoming;
 * set TASTABLE_FIXED_NOW to pin the anchor date (used by tests).
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { directDatabaseUrl } from "../src/lib/database-url";
import { quote } from "../src/lib/booking/pricing";
import { cancellationFee, computeRefund, policySnapshot } from "../src/lib/booking/refunds";
import { nyDateTime, serverNow } from "../src/lib/clock";
import { getNeighborhood } from "../src/lib/domain/neighborhoods";
import { EVENT_IMAGE_CREDIT, eventImagesFor } from "../src/lib/domain/event-images";
import { PHOTOS } from "../src/lib/domain/photos";
import { isoDateNY } from "../src/lib/format";
import {
  BACKGROUND_GUESTS,
  DEMO_GUESTS,
  EXPERIENCES,
  HOSTS,
  POLICIES,
  VENUES,
  type ExperienceSeed,
} from "./seed-data";
import { seedFoundation } from "./seed-foundation";
import { seedUpcoming } from "./seed-upcoming";
import { reminderTime } from "../src/lib/booking/cancellation";
import { seedReginasTable } from "./seed-regina";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: directDatabaseUrl() }),
});

// ─── Deterministic helpers ───────────────────────────────────────────────────
let state = 20261102;
function rand() {
  state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  return state / 4294967296;
}
const between = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function counterCode(n: number, len: number) {
  let out = "";
  let x = n * 7919 + 104729; // spread consecutive numbers apart
  for (let i = 0; i < len; i++) {
    out = ALPHA[x % ALPHA.length] + out;
    x = Math.floor(x / ALPHA.length);
  }
  return out;
}

const NOW = serverNow();
const TODAY = isoDateNY(NOW);

function addDaysIso(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
function weekdayOf(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
const minutes = (n: number) => n * 60_000;
const hoursMs = (n: number) => n * 3_600_000;

/**
 * Real accounts (isDemo = false) keep their login, guest/host profile and taste preferences across a
 * demo reset. Everything tied to the sample catalog (bookings, saves, reviews, events) is rebuilt.
 */
const demoOnly = { user: { isDemo: true } };

async function wipe() {
  // Children first. The database enforces foreign keys, so order matters.
  await db.reviewReport.deleteMany();
  await db.review.deleteMany();
  await db.guestFavoriteDish.deleteMany({ where: { preferences: { guestProfile: demoOnly } } });
  await db.experienceDish.deleteMany();
  await db.experienceItineraryStep.deleteMany();
  await db.experienceMenuItem.deleteMany();
  await db.experienceMenuSection.deleteMany();
  await db.calendarShareItem.deleteMany();
  await db.calendarSharingPreference.deleteMany({ where: { guestProfile: demoOnly } });
  await db.eventInvitation.deleteMany();
  await db.waitlistEntry.deleteMany();
  await db.bookingTicket.deleteMany();
  await db.booking.deleteMany();
  await db.eventExpense.deleteMany();
  await db.savedExperience.deleteMany();
  await db.experienceDailyStat.deleteMany();
  await db.experiencePhoto.deleteMany();
  await db.experienceSession.deleteMany();
  await db.experience.deleteMany();
  await db.cancellationPolicy.deleteMany();
  await db.venueAssistanceRequest.deleteMany();
  await db.venue.deleteMany();
  await db.guestPreferences.deleteMany({ where: { guestProfile: demoOnly } });
  await db.guestProfile.deleteMany({ where: demoOnly });
  await db.hostProfile.deleteMany({ where: demoOnly });
  await db.user.deleteMany({ where: { isDemo: true } });
}

async function main() {
  console.log(`Seeding fictional demo data (anchor date ${TODAY}, New York)…`);
  await wipe();

  // ── Policies (platform templates) ──
  const policyIds = new Map<string, string>();
  for (const p of POLICIES) {
    const row = await db.cancellationPolicy.create({ data: { id: `pol_${p.key.toLowerCase()}`, ...p, hostId: null } });
    policyIds.set(p.key, row.id);
  }

  // ── Users: demo guests, background guests, hosts. Every user also gets a guest profile. ──
  const guestProfileIds = new Map<string, string>();
  async function createUser(key: string, name: string, email: string, role: "GUEST" | "HOST", homeNeighborhood?: string) {
    const user = await db.user.create({
      data: {
        id: `usr_${key}`,
        name,
        email,
        role,
        isDemo: true,
        guestProfile: { create: { id: `gst_${key}`, displayName: name, homeNeighborhood: homeNeighborhood ?? null } },
      },
    });
    guestProfileIds.set(key, `gst_${key}`);
    return user;
  }

  for (const g of DEMO_GUESTS) await createUser(g.key, g.name, g.email, "GUEST", g.neighborhood);
  for (const g of BACKGROUND_GUESTS) await createUser(g.key, g.name, g.email, "GUEST");

  const hostIds = new Map<string, string>();
  for (const h of HOSTS) {
    await createUser(h.key, h.name, `${h.key}.host@example.com`, "HOST", h.neighborhood);
    const host = await db.hostProfile.create({
      data: {
        id: `hst_${h.key}`,
        userId: `usr_${h.key}`,
        slug: h.key,
        displayName: h.displayName,
        hostType: h.hostType,
        tagline: h.tagline,
        background: h.background,
        bio: h.bio,
        homeNeighborhood: h.neighborhood,
        cuisineExpertise: h.cuisines.join(","),
        credentials: h.credentials.join("\n"),
        instagramHandle: h.instagram ?? null,
        followerCount: h.followers,
        verified: h.verified,
        isFictional: true,
        onboardingCompletedAt: new Date(NOW.getTime() - 200 * 86_400_000),
      },
    });
    hostIds.set(h.key, host.id);
  }

  // ── Venues ──
  const venueIds = new Map<string, string>();
  for (const v of VENUES) {
    const n = getNeighborhood(v.neighborhood)!;
    const jitter = () => (rand() - 0.5) * 0.008;
    await db.venue.create({
      data: {
        id: `ven_${v.key}`,
        slug: v.key,
        name: v.name,
        type: v.type,
        neighborhood: n.name,
        borough: n.borough,
        addressLine: v.address,
        latitude: n.lat + jitter(),
        longitude: n.lng + jitter(),
        maxCapacity: v.capacity,
        isSecretLocation: v.secret ?? false,
        accessibilityNotes: v.accessibility ?? null,
        managedByHostId: v.host ? hostIds.get(v.host)! : null,
        isFictional: true,
      },
    });
    venueIds.set(v.key, `ven_${v.key}`);
  }

  // ── Experiences, sessions, bookings ──
  let bookingCounter = 1;
  let ticketCounter = 1;
  const stats = { sessions: 0, upcoming: 0, bookings: 0, cancelled: 0, soldOut: 0, nearly: 0 };

  for (const [index, e] of EXPERIENCES.entries()) {
    const expId = `exp_${e.slug}`;
    await db.experience.create({
      data: {
        id: expId,
        slug: e.slug,
        title: e.title,
        summary: e.summary,
        description: e.description,
        category: e.category,
        cuisine: e.cuisine,
        tags: e.tags.join(","),
        dietaryOptions: e.dietary.join(","),
        socialAtmosphere: e.atmosphere,
        format: e.format,
        occasions: e.occasions.join(","),
        highlights: JSON.stringify(e.highlights),
        menu: JSON.stringify(e.menu),
        inclusions: JSON.stringify(e.inclusions),
        status: "PUBLISHED",
        publishedAt: new Date(NOW.getTime() - (120 - index) * 86_400_000),
        hostId: hostIds.get(e.host)!,
        venueId: venueIds.get(e.venue)!,
        cancellationPolicyId: policyIds.get(e.policy)!,
        ticketPriceCents: e.priceDollars * 100,
        durationMinutes: e.durationMinutes,
        defaultCapacity: e.capacity,
        featured: e.featured ?? false,
        isFictional: true,
        photos: {
          // Tastable's own image (matched by filename) leads when there is one; placeholders follow.
          create: [
            ...eventImagesFor(e.slug).map((p) => ({ ...p, credit: EVENT_IMAGE_CREDIT })),
            ...e.photos.map((key) => ({ url: PHOTOS[key].src, alt: PHOTOS[key].alt, credit: "Unsplash (placeholder)" })),
          ]
            .slice(0, 3)
            .map((p, i) => ({ ...p, sortOrder: i })),
        },
      },
    });

    // Simulated listing views for the last 60 days (+ the 60 before, for growth).
    const statRows = [];
    for (let d = 1; d <= 60; d++) {
      const iso = addDaysIso(TODAY, -d);
      const weekend = [5, 6, 0].includes(weekdayOf(iso)) ? 1.35 : 1;
      const trend = 0.75 + (60 - d) / 120; // recent days a little busier
      statRows.push({ experienceId: expId, date: nyDateTime(iso), views: Math.round(e.popularity * 22 * weekend * trend + rand() * 8) });
    }
    // Earlier history (days 61–180) for growth comparisons. No rand() here, so the rest of the
    // seed sequence is unchanged. Each experience gets its own baseline, so growth differs.
    const baseline = 0.55 + ((index * 7) % 10) / 20;
    for (let d = 61; d <= 180; d++) {
      const iso = addDaysIso(TODAY, -d);
      const weekend = [5, 6, 0].includes(weekdayOf(iso)) ? 1.35 : 1;
      statRows.push({ experienceId: expId, date: nyDateTime(iso), views: Math.round(e.popularity * 22 * weekend * baseline + ((d * 13) % 8)) });
    }
    await db.experienceDailyStat.createMany({ data: statRows });

    // Session dates: past occurrences (last ~90 days, every other match) and upcoming ones.
    const pastDates: string[] = [];
    for (let d = 90, k = 0; d >= 2; d--) {
      const iso = addDaysIso(TODAY, -d);
      if (e.weekdays.includes(weekdayOf(iso)) && k++ % 3 === 0) pastDates.push(iso);
    }
    const futureDates: string[] = [];
    for (let d = 1; d <= 42 && futureDates.length < (index % 3 === 0 ? 3 : 2); d++) {
      const iso = addDaysIso(TODAY, d);
      if (e.weekdays.includes(weekdayOf(iso)) && (futureDates.length === 0 || d - daysBetween(TODAY, futureDates.at(-1)!) >= 6)) {
        futureDates.push(iso);
      }
    }

    for (const [si, iso] of [...pastDates.map((d) => [d, "past"] as const), ...futureDates.map((d) => [d, "future"] as const)].entries()) {
      const [date, when] = iso;
      const startsAt = nyDateTime(date, e.hour, e.hour === 10 || e.hour === 11 ? 0 : 30);
      const sessionId = `ses_${e.slug}_${si}`;
      const target = targetFill(e, when, si);
      await db.experienceSession.create({
        data: {
          id: sessionId,
          experienceId: expId,
          startsAt,
          endsAt: new Date(startsAt.getTime() + minutes(e.durationMinutes)),
          capacity: e.capacity,
          seatsReserved: 0,
          status: when === "past" ? "COMPLETED" : "SCHEDULED",
          createdAt: new Date(startsAt.getTime() - 60 * 86_400_000),
        },
      });
      stats.sessions++;
      if (when === "future") stats.upcoming++;
      if (when === "future" && target === e.capacity) stats.soldOut++;
      if (when === "future" && e.capacity - target > 0 && e.capacity - target <= 2) stats.nearly++;

      // Fill with bookings from background guests until the target is reached.
      let reserved = 0;
      while (reserved < target) {
        const roll = rand();
        const tickets = Math.min(target - reserved, roll < 0.3 ? 1 : roll < 0.8 ? 2 : roll < 0.9 ? 3 : 4);
        const created = await seedBooking({ e, sessionId, startsAt, tickets, when, guestKey: pick(BACKGROUND_GUESTS).key, cancel: false });
        if (created.active) reserved += tickets;
      }
      // Some cancelled bookings (do not hold seats).
      const cancellations = when === "past" ? (rand() < 0.5 ? 1 : 0) : rand() < 0.35 ? 1 : 0;
      for (let c = 0; c < cancellations; c++) {
        await seedBooking({ e, sessionId, startsAt, tickets: between(1, 2), when, guestKey: pick(BACKGROUND_GUESTS).key, cancel: true });
      }
      await db.experienceSession.update({ where: { id: sessionId }, data: { seatsReserved: reserved } });

      // Waitlists on sold-out upcoming sessions.
      if (when === "future" && reserved >= e.capacity) {
        for (let w = 0; w < 2; w++) {
          const guest = BACKGROUND_GUESTS[(index * 3 + w * 7 + si) % BACKGROUND_GUESTS.length];
          await db.waitlistEntry.upsert({
            where: { sessionId_guestId: { sessionId, guestId: guestProfileIds.get(guest.key)! } },
            create: { sessionId, guestId: guestProfileIds.get(guest.key)!, partySize: between(1, 2), createdAt: new Date(NOW.getTime() - hoursMs(between(2, 72))) },
            update: {},
          });
        }
      }

      // Expenses for past sessions (ingredients, staff, sometimes venue).
      if (when === "past") {
        const revenue = target * e.priceDollars * 100;
        const expenseDate = new Date(startsAt.getTime() - 86_400_000);
        const items: { category: "INGREDIENTS" | "STAFF" | "VENUE" | "BEVERAGES" | "EQUIPMENT"; description: string; amount: number }[] = [
          { category: "INGREDIENTS", description: "Ingredients and produce", amount: Math.round(revenue * (0.18 + rand() * 0.1)) },
          { category: "STAFF", description: "Kitchen and service help", amount: Math.round(revenue * (0.08 + rand() * 0.06)) },
        ];
        const venue = VENUES.find((v) => v.key === e.venue)!;
        if (venue.host !== e.host) items.push({ category: "VENUE", description: `${venue.name} hire`, amount: Math.round(revenue * 0.12) });
        if (e.tags.includes("wine") || e.tags.includes("sake") || e.tags.includes("cocktails")) {
          items.push({ category: "BEVERAGES", description: "Drinks for pairings", amount: Math.round(revenue * 0.1) });
        }
        await db.eventExpense.createMany({
          data: items.map((it) => ({
            hostId: hostIds.get(e.host)!,
            experienceId: expId,
            sessionId,
            category: it.category,
            description: it.description,
            amountCents: it.amount,
            incurredAt: expenseDate,
          })),
        });
      }
    }

    // One marketing expense per experience in the last month.
    await db.eventExpense.create({
      data: {
        hostId: hostIds.get(e.host)!,
        experienceId: expId,
        category: "MARKETING",
        description: "Social media promotion (simulated)",
        amountCents: between(40, 150) * 100,
        incurredAt: new Date(NOW.getTime() - between(3, 28) * 86_400_000),
      },
    });
  }

  async function seedBooking(args: {
    e: ExperienceSeed;
    sessionId: string;
    startsAt: Date;
    tickets: number;
    when: "past" | "future";
    guestKey: string;
    cancel: boolean;
  }) {
    const { e, startsAt, tickets, when } = args;
    const price = quote(e.priceDollars * 100, tickets);
    const policy = POLICIES.find((p) => p.key === e.policy)!;
    const latest = Math.min(startsAt.getTime() - hoursMs(2), NOW.getTime() - hoursMs(1));
    const createdAt = new Date(latest - hoursMs(between(6, when === "past" ? 30 * 24 : 40 * 24)));
    const n = bookingCounter++;
    const guest = BACKGROUND_GUESTS.find((g) => g.key === args.guestKey) ?? DEMO_GUESTS.find((g) => g.key === args.guestKey)!;

    let status: "CONFIRMED" | "COMPLETED" | "CANCELLED" = when === "past" ? "COMPLETED" : "CONFIRMED";
    let refund = 0;
    let cancelledAt: Date | null = null;
    if (args.cancel) {
      status = "CANCELLED";
      cancelledAt = new Date(createdAt.getTime() + (latest - createdAt.getTime()) * rand());
      refund = computeRefund(price, policy, startsAt, cancelledAt).refundCents;
      stats.cancelled++;
    }
    stats.bookings++;

    await db.booking.create({
      data: {
        id: `bkg_${String(n).padStart(4, "0")}`,
        reference: `TBL-${counterCode(n, 6)}`,
        guestId: guestProfileIds.get(args.guestKey)!,
        sessionId: args.sessionId,
        status,
        ticketCount: tickets,
        unitPriceCents: price.unitPriceCents,
        subtotalCents: price.subtotalCents,
        serviceFeeCents: price.serviceFeeCents,
        totalPriceCents: price.totalCents,
        refundAmountCents: refund,
        contactName: guest.name,
        contactEmail: guest.email,
        dietaryRequirements: rand() < 0.2 ? pick(["Vegetarian", "No shellfish", "Nut allergy", "Gluten-free", "Vegan"]) : null,
        policyAcknowledgedAt: createdAt,
        policySnapshot: policySnapshot(policy),
        cancellationPolicyId: policyIds.get(e.policy)!,
        cancellationPolicyVersion: 1,
        ...(args.cancel ? (({ feeCents, feePercent }) => ({ cancellationFeeCents: feeCents, cancellationFeePercent: feePercent }))(cancellationFee(price, { tier: "FULL", refundCents: refund })) : {}),
        cancelledAt,
        cancelledBy: args.cancel ? "GUEST" : null,
        cancellationReason: args.cancel ? pick(["Plans changed", "Feeling unwell", "Travel conflict"]) : null,
        paymentStatus: !args.cancel || refund === 0 ? "SIMULATED_PAID" : refund >= price.subtotalCents ? "SIMULATED_REFUNDED" : "SIMULATED_PARTIALLY_REFUNDED",
        paymentReference: `sim_seed_${String(n).padStart(5, "0")}`,
        isFictional: true,
        createdAt,
        tickets: {
          create: Array.from({ length: tickets }, (_, i) => ({
            code: `TKT-${counterCode(ticketCounter++, 4)}-${counterCode(n + i, 4)}-${counterCode(i, 2)}`,
            attendeeName: i === 0 ? guest.name : null,
            status: args.cancel ? "CANCELLED" : when === "past" ? "CHECKED_IN" : "VALID",
            checkedInAt: !args.cancel && when === "past" ? startsAt : null,
          })),
        },
      },
    });
    return { active: !args.cancel, id: `bkg_${String(n).padStart(4, "0")}` };
  }

  // ── Jordan (onboarded demo guest): preferences, bookings, saves, sharing, invitation ──
  const jordan = guestProfileIds.get("jordan")!;
  const alex = guestProfileIds.get("alex")!;
  await db.guestPreferences.create({
    data: {
      guestProfileId: jordan,
      locationKey: "williamsburg",
      travelRadiusMiles: 5,
      favoriteCuisines: "korean,italian,japanese",
      favoriteCategories: "COOKING_CLASS_WORKSHOP,SOCIAL_CULINARY",
      motivations: "LEARN,MEET_PEOPLE",
      maxBudgetCents: 10000,
      onboardingCompletedAt: new Date(NOW.getTime() - 20 * 86_400_000),
    },
  });

  // Jordan books two upcoming sessions with seats left (2 tickets each), has one past and one cancelled booking.
  const upcomingWithSeats = await db.experienceSession.findMany({
    where: { status: "SCHEDULED", startsAt: { gt: NOW } },
    include: { experience: true },
    orderBy: [{ startsAt: "asc" }, { id: "asc" }],
  });
  const jordanTargets = upcomingWithSeats.filter((s) => s.capacity - s.seatsReserved >= 4).slice(0, 3);
  const jordanBookingIds: string[] = [];
  for (const [i, s] of jordanTargets.entries()) {
    const seed = EXPERIENCES.find((x) => x.slug === s.experience.slug)!;
    const cancel = i === 2;
    const result = await seedBooking({ e: seed, sessionId: s.id, startsAt: s.startsAt, tickets: 2, when: "future", guestKey: "jordan", cancel });
    if (!cancel) {
      await db.experienceSession.update({ where: { id: s.id }, data: { seatsReserved: { increment: 2 } } });
      jordanBookingIds.push(result.id);
    }
  }
  const pastSession = await db.experienceSession.findFirst({
    where: { status: "COMPLETED", experience: { slug: "italian-pasta-making-workshop" } },
    orderBy: { startsAt: "desc" },
  });
  if (pastSession) {
    const seed = EXPERIENCES.find((x) => x.slug === "italian-pasta-making-workshop")!;
    await seedBooking({ e: seed, sessionId: pastSession.id, startsAt: pastSession.startsAt, tickets: 2, when: "past", guestKey: "jordan", cancel: false });
    await db.experienceSession.update({ where: { id: pastSession.id }, data: { seatsReserved: { increment: 2 } } });
  }

  for (const slug of ["brooklyn-japanese-chefs-table", "korean-fermentation-workshop", "secret-location-tasting-dinner"]) {
    await db.savedExperience.create({ data: { guestId: jordan, experienceId: `exp_${slug}`, createdAt: new Date(NOW.getTime() - between(1, 9) * 86_400_000) } });
  }
  // Background saves, weighted by popularity, for Culinary Trends.
  for (const g of BACKGROUND_GUESTS) {
    for (const e of EXPERIENCES) {
      if (rand() < 0.06 * e.popularity) {
        await db.savedExperience.create({ data: { guestId: guestProfileIds.get(g.key)!, experienceId: `exp_${e.slug}` } });
      }
    }
  }

  // Jordan shares one booked session on a public calendar; invites Alex to the other.
  if (jordanTargets[0]) {
    await db.calendarSharingPreference.create({
      data: {
        guestProfileId: jordan,
        visibility: "PUBLIC",
        showExperienceTitles: true,
        shareToken: "demo-share-jordan-k7Qm2xV9pL4tR8wN3cY6",
        sharedAt: new Date(NOW.getTime() - 5 * 86_400_000),
        items: { create: [{ sessionId: jordanTargets[0].id }] },
      },
    });
  }
  if (jordanTargets[1] && jordanBookingIds[1]) {
    await db.eventInvitation.create({
      data: {
        sessionId: jordanTargets[1].id,
        inviterId: jordan,
        bookingId: jordanBookingIds[1],
        inviteeEmail: "alex.guest@example.com",
        inviteeName: "Alex",
        inviteeId: alex,
        message: "I have a spare ticket. Want to come?",
        token: "demo-invite-alex-Hq3Zt8LmV2nP6yR1sK9w",
        status: "PENDING",
        expiresAt: jordanTargets[1].startsAt,
      },
    });
  }
  // Alex has a preferences row but has not onboarded yet.
  await db.guestPreferences.create({ data: { guestProfileId: alex } });

  // Zoe (24, student, low budget) and Sofia (34, high budget, follows a creator). No RNG used.
  await db.guestPreferences.create({
    data: {
      guestProfileId: guestProfileIds.get("zoe")!,
      locationKey: "east-village",
      travelRadiusMiles: 5,
      favoriteCuisines: "korean,mexican,middle-eastern",
      favoriteCategories: "POPUP_EXCLUSIVE,SOCIAL_CULINARY",
      motivations: "UNIQUE,FRIENDS",
      maxBudgetCents: 6000,
      onboardingCompletedAt: new Date(NOW.getTime() - 12 * 86_400_000),
    },
  });
  await db.guestPreferences.create({
    data: {
      guestProfileId: guestProfileIds.get("sofia")!,
      locationKey: "nyc",
      favoriteCuisines: "indian,french,japanese",
      favoriteCategories: "POPUP_EXCLUSIVE,SUPPER_CLUB_PRIVATE_DINING",
      motivations: "UNIQUE,MEET_CHEF,SPECIAL_OCCASION",
      followedHosts: "priya-raman",
      onboardingCompletedAt: new Date(NOW.getTime() - 30 * 86_400_000),
    },
  });
  const personaSaves: [string, string[]][] = [
    ["zoe", ["east-village-taco-pop-up", "spice-market-walk"]],
    ["sofia", ["rooftop-creator-supper-club", "harlem-art-gallery-dinner", "soho-loft-chefs-dinner"]],
  ];
  for (const [key, slugs] of personaSaves) {
    for (const [i, slug] of slugs.entries()) {
      await db.savedExperience.create({ data: { guestId: guestProfileIds.get(key)!, experienceId: `exp_${slug}`, createdAt: new Date(NOW.getTime() - (i + 2) * 86_400_000) } });
    }
  }

  // Background guests: onboarding answers derived from what they booked (deterministic, no RNG).
  const OCCASION_TO_MOTIVATION: Record<string, string> = {
    DATE_NIGHT: "DATE_NIGHT",
    BRING_A_FRIEND: "FRIENDS",
    MEET_NEW_PEOPLE: "MEET_PEOPLE",
    LEARN_SOMETHING_NEW: "LEARN",
    SPECIAL_OCCASION: "SPECIAL_OCCASION",
  };
  const top = (m: Map<string, number>, n: number) =>
    [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n).map(([k]) => k);
  for (const g of BACKGROUND_GUESTS) {
    const guestProfileId = `gst_${g.key}`;
    const rows = await db.booking.findMany({
      where: { guestId: guestProfileId },
      select: { session: { select: { experience: { select: { cuisine: true, category: true, occasions: true, format: true } } } } },
    });
    const cuisines = new Map<string, number>();
    const categories = new Map<string, number>();
    const motivations = new Map<string, number>();
    for (const r of rows) {
      const e = r.session.experience;
      cuisines.set(e.cuisine, (cuisines.get(e.cuisine) ?? 0) + 1);
      categories.set(e.category, (categories.get(e.category) ?? 0) + 1);
      if (e.category === "POPUP_EXCLUSIVE") motivations.set("UNIQUE", (motivations.get("UNIQUE") ?? 0) + 1);
      if (e.format === "CHEFS_TABLE") motivations.set("MEET_CHEF", (motivations.get("MEET_CHEF") ?? 0) + 1);
      for (const o of e.occasions.split(",").filter(Boolean)) {
        const m = OCCASION_TO_MOTIVATION[o];
        if (m) motivations.set(m, (motivations.get(m) ?? 0) + 1);
      }
    }
    await db.guestPreferences.create({
      data: {
        guestProfileId,
        favoriteCuisines: top(cuisines, 3).join(","),
        favoriteCategories: top(categories, 2).join(","),
        motivations: top(motivations, 3).join(","),
        onboardingCompletedAt: NOW,
      },
    });
  }

  // One-time events filling the next 14 days (after persona bookings, so those are unchanged).
  const upcoming = await seedUpcoming(db, NOW, policyIds);

  const foundation = await seedFoundation(db, NOW);

  // In-app reminders, 24 hours before, for confirmed bookings of upcoming sessions (shown in Tastable only).
  const upcomingBookings = await db.booking.findMany({
    where: { status: "CONFIRMED", session: { status: "SCHEDULED", startsAt: { gt: NOW } } },
    select: { id: true, session: { select: { startsAt: true } } },
  });
  await db.bookingReminder.createMany({
    data: upcomingBookings.map((b) => ({ id: `rem_${b.id}`, bookingId: b.id, remindAt: reminderTime(b.session.startsAt), createdAt: NOW })),
  });

  // Regina's Table: the one-time demo event on a fixed date (own step, no RNG; see seed-regina.ts).
  const regina = await seedReginasTable(db, NOW);

  const counts = {
    ...foundation,
    reginasTable: regina,
    ...upcoming,
    users: await db.user.count(),
    hosts: await db.hostProfile.count(),
    venues: await db.venue.count(),
    experiences: await db.experience.count(),
    sessions: stats.sessions,
    upcomingSessions: stats.upcoming,
    soldOutUpcoming: stats.soldOut,
    nearlySoldOutUpcoming: stats.nearly,
    bookings: await db.booking.count(),
    cancelledBookings: await db.booking.count({ where: { status: "CANCELLED" } }),
    tickets: await db.bookingTicket.count(),
    expenses: await db.eventExpense.count(),
    waitlist: await db.waitlistEntry.count(),
  };
  console.log("Seeded fictional demo data:", counts);
}

function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

function targetFill(e: ExperienceSeed, when: "past" | "future", sessionIndex: number) {
  if (when === "past") return Math.min(e.capacity, Math.round(e.capacity * (0.55 + rand() * 0.45)));
  switch (e.fill) {
    case "sold-out":
      return e.capacity;
    case "nearly":
      return e.capacity - (sessionIndex % 2 === 0 ? 1 : 2);
    case "busy":
      return Math.round(e.capacity * (0.5 + rand() * 0.3));
    default:
      return Math.round(e.capacity * (0.15 + rand() * 0.3));
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
