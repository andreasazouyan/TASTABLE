/**
 * Seeds the FICTIONAL one-time events that fill the next 14 days (see seed-upcoming-data.ts).
 * Runs after the persona bookings, so existing demo bookings are unchanged, and uses no
 * randomness, so the rest of the deterministic seed is unchanged too. Creates hosts, venues,
 * experiences and one session each; never creates bookings, saves or waitlist entries.
 */
import type { PrismaClient } from "../src/generated/prisma/client";
import { nyDateTime } from "../src/lib/clock";
import { EVENT_IMAGE_CREDIT, EVENT_IMAGE_DIR } from "../src/lib/domain/event-images";
import { getNeighborhood } from "../src/lib/domain/neighborhoods";
import { PHOTOS } from "../src/lib/domain/photos";
import { isoDateNY } from "../src/lib/format";
import { planUpcoming, UPCOMING_HOSTS, UPCOMING_VENUES, UPCOMING_WINDOW_DAYS } from "./seed-upcoming-data";

const DAY = 86_400_000;

function nyClock(now: Date) {
  const t = new Intl.DateTimeFormat("en-GB", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
  return `${isoDateNY(now)} ${t}`;
}

export async function seedUpcoming(db: PrismaClient, now: Date, policyIds: Map<string, string>) {
  const today = isoDateNY(now);
  const windowEnd = nyDateTime(new Date(Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8) + UPCOMING_WINDOW_DAYS)).toISOString().slice(0, 10));

  // What's already on each day (the weekly events seeded before this step).
  const existingSessions = await db.experienceSession.findMany({
    where: { status: "SCHEDULED", startsAt: { gte: nyDateTime(today), lt: windowEnd } },
    select: { startsAt: true },
  });
  const existing: Record<string, number> = {};
  for (const s of existingSessions) existing[isoDateNY(s.startsAt)] = (existing[isoDateNY(s.startsAt)] ?? 0) + 1;

  for (const h of UPCOMING_HOSTS) {
    await db.user.create({
      data: {
        id: `usr_${h.key}`,
        name: h.name,
        email: `${h.key}.host@example.com`,
        role: "HOST",
        isDemo: true,
        guestProfile: { create: { id: `gst_${h.key}`, displayName: h.name, homeNeighborhood: h.neighborhood } },
      },
    });
    await db.hostProfile.create({
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
        onboardingCompletedAt: new Date(now.getTime() - 90 * DAY),
      },
    });
  }

  for (const [i, v] of UPCOMING_VENUES.entries()) {
    const n = getNeighborhood(v.neighborhood)!;
    // Small fixed offsets (no randomness) so pins don't stack on the neighborhood centre.
    const dx = (((i * 37) % 9) - 4) * 0.001;
    const dy = (((i * 53) % 9) - 4) * 0.001;
    await db.venue.create({
      data: {
        id: `ven_${v.key}`,
        slug: v.key,
        name: v.name,
        type: v.type,
        neighborhood: n.name,
        borough: n.borough,
        addressLine: v.address,
        latitude: n.lat + dy,
        longitude: n.lng + dx,
        maxCapacity: v.capacity,
        isSecretLocation: v.secret ?? false,
        accessibilityNotes: v.accessibility ?? null,
        managedByHostId: v.host ? `hst_${v.host}` : null,
        isFictional: true,
      },
    });
  }

  const plan = planUpcoming(today, nyClock(now), existing);
  for (const [index, { event: e, date, time, seatsReserved }] of plan.entries()) {
    const expId = `exp_${e.slug}`;
    const startsAt = nyDateTime(date, Number(time.slice(0, 2)), Number(time.slice(3, 5)));
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
        publishedAt: new Date(now.getTime() - (21 - (index % 20)) * DAY),
        hostId: `hst_${e.host}`,
        venueId: `ven_${e.venue}`,
        cancellationPolicyId: policyIds.get(e.policy)!,
        ticketPriceCents: e.priceDollars * 100,
        durationMinutes: e.durationMinutes,
        defaultCapacity: e.capacity,
        featured: e.featured ?? false,
        isFictional: true,
        photos: {
          create: [
            ...(e.cover ? [{ url: `${EVENT_IMAGE_DIR}/${e.cover}`, alt: `Illustrative photo for ${e.title}`, credit: EVENT_IMAGE_CREDIT }] : []),
            ...e.photos.map((key) => ({ url: PHOTOS[key].src, alt: PHOTOS[key].alt, credit: "Unsplash (placeholder)" })),
          ]
            .slice(0, 3)
            .map((p, i) => ({ ...p, sortOrder: i })),
        },
        sessions: {
          create: {
            id: `ses_${e.slug}_0`,
            startsAt,
            endsAt: new Date(startsAt.getTime() + e.durationMinutes * 60_000),
            capacity: e.capacity,
            seatsReserved,
            status: "SCHEDULED",
            createdAt: new Date(now.getTime() - 14 * DAY),
          },
        },
      },
    });

    // Simulated listing views for the last 30 days, scaled by popularity (no randomness).
    const stats = [];
    for (let d = 1; d <= 30; d++) {
      stats.push({ experienceId: expId, date: nyDateTime(isoDateNY(new Date(now.getTime() - d * DAY))), views: Math.round(e.popularity * 18 * (0.7 + ((d * 7 + index) % 10) / 20)) });
    }
    await db.experienceDailyStat.createMany({ data: stats });
  }

  return { upcomingEvents: plan.length, upcomingHosts: UPCOMING_HOSTS.length, upcomingVenues: UPCOMING_VENUES.length };
}
