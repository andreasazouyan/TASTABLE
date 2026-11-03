import type { PrismaClient } from "@/generated/prisma/client";
import { nyDateTime } from "@/lib/clock";
import { getNeighborhood } from "@/lib/domain/neighborhoods";
import { normalizeDish, normalizeDishList } from "@/lib/domain/dishes";
import { legacyMenuFromSections, sectionsFromLegacyMenu, stepDuration } from "@/lib/domain/event-content";
import { serializeList } from "@/lib/domain/lists";
import { publishProblems, type EventInput } from "@/lib/validation/event";
import { cancelBooking } from "@/server/services/bookings";
import { DomainError } from "@/server/services/errors";

type Db = PrismaClient;

/** Every host mutation goes through this: only the owning host may change an event. */
export async function assertOwnsExperience(db: Db, hostId: string, experienceId: string) {
  const exp = await db.experience.findUnique({ where: { id: experienceId }, select: { id: true, hostId: true, status: true, venueId: true } });
  if (!exp) throw new DomainError("Event not found.", "NOT_FOUND");
  if (exp.hostId !== hostId) throw new DomainError("You can only manage your own events.", "FORBIDDEN");
  return exp;
}

export function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "experience"
  );
}

async function uniqueSlug(db: Db, title: string, exceptId?: string) {
  const base = slugify(title);
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const clash = await db.experience.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!clash || clash.id === exceptId) return candidate;
  }
  return `${base}-${Date.now()}`;
}

async function resolveVenue(db: Db, hostId: string, input: EventInput["venue"]) {
  if (input.mode === "existing") {
    const venue = await db.venue.findUnique({ where: { id: input.venueId } });
    // Hosts can use venues they manage, or any venue already hosting their own events.
    const used = venue && (venue.managedByHostId === hostId || (await db.experience.count({ where: { hostId, venueId: venue.id } })) > 0);
    if (!venue || !used) throw new DomainError("Choose one of your venues.", "FORBIDDEN");
    return venue;
  }
  if (input.mode === "new") {
    const n = getNeighborhood(input.neighborhood)!;
    return db.venue.create({
      data: {
        slug: `${slugify(input.name)}-${Math.random().toString(36).slice(2, 7)}`,
        name: input.name,
        type: input.type,
        neighborhood: n.name,
        borough: n.borough,
        addressLine: input.addressLine,
        latitude: n.lat,
        longitude: n.lng,
        maxCapacity: input.maxCapacity,
        isSecretLocation: input.isSecretLocation,
        managedByHostId: hostId,
        isFictional: false,
      },
    });
  }
  // Venue to be confirmed: a per-host placeholder. Events on it stay in draft.
  const existing = await db.venue.findFirst({ where: { managedByHostId: hostId, isPlaceholder: true } });
  if (existing) return existing;
  const host = await db.hostProfile.findUniqueOrThrow({ where: { id: hostId } });
  const n = getNeighborhood(host.homeNeighborhood) ?? getNeighborhood("flatiron")!;
  return db.venue.create({
    data: {
      slug: `tbc-${hostId}`,
      name: "Venue to be confirmed",
      type: "SECRET_LOCATION",
      neighborhood: n.name,
      borough: n.borough,
      addressLine: "To be confirmed",
      latitude: n.lat,
      longitude: n.lng,
      maxCapacity: 0,
      isPlaceholder: true,
      managedByHostId: hostId,
      isFictional: false,
    },
  });
}

async function resolvePolicy(db: Db, hostId: string, input: EventInput["policy"]) {
  if (input.mode === "template") {
    const p = await db.cancellationPolicy.findUnique({ where: { id: input.templateId } });
    if (!p || (p.hostId && p.hostId !== hostId)) throw new DomainError("Choose a cancellation policy.");
    return p;
  }
  if (input.partialRefundHours !== null && input.partialRefundHours >= input.fullRefundHours) {
    throw new DomainError("The partial-refund window must end closer to the event than the full-refund window.");
  }
  const parts = [`Full refund more than ${input.fullRefundHours} hours before.`];
  if (input.partialRefundHours !== null && input.partialRefundPercent > 0) {
    parts.push(`${input.partialRefundPercent}% refund ${input.partialRefundHours}–${input.fullRefundHours} hours before.`);
  }
  parts.push(`No refund within ${input.partialRefundHours ?? input.fullRefundHours} hours.`);
  const key = `CUSTOM_${input.fullRefundHours}_${input.partialRefundHours ?? "X"}_${input.partialRefundPercent}`;
  return db.cancellationPolicy.upsert({
    where: { hostId_key: { hostId, key } },
    create: {
      hostId,
      key,
      name: "Custom terms",
      summary: parts.join(" "),
      fullRefundHours: input.fullRefundHours,
      partialRefundHours: input.partialRefundPercent > 0 ? input.partialRefundHours : null,
      partialRefundPercent: input.partialRefundHours === null ? 0 : input.partialRefundPercent,
    },
    update: {},
  });
}

/**
 * Creates or updates an event. Publishing requires a confirmed venue, dates, a photo and a menu.
 * Sessions with bookings are never deleted and their capacity can't drop below seats sold.
 */
export async function saveEvent(db: Db, hostId: string, input: EventInput, now: Date, experienceId?: string) {
  if (experienceId) await assertOwnsExperience(db, hostId, experienceId);
  const venue = await resolveVenue(db, hostId, input.venue);
  const policy = await resolvePolicy(db, hostId, input.policy);

  const wantsPublish = input.intent === "publish";
  if (wantsPublish) {
    const problems = publishProblems(input, venue.isPlaceholder);
    if (problems.length) throw new DomainError(problems.join(" "));
    const future = input.sessions.filter((s) => nyDateTime(s.date, ...(s.time.split(":").map(Number) as [number, number])) > now);
    if (!future.length) throw new DomainError("Add at least one future date to publish.");
  }

  const data = {
    title: input.title,
    summary: input.summary,
    description: input.description,
    category: input.category,
    cuisine: input.cuisine,
    tags: serializeList(input.tags),
    format: input.format,
    occasions: serializeList(input.occasions),
    socialAtmosphere: input.socialAtmosphere,
    dietaryOptions: serializeList(input.dietaryOptions),
    highlights: JSON.stringify(input.highlights),
    menu: JSON.stringify(input.menuSections ? legacyMenuFromSections(input.menuSections) : input.menu),
    ...(input.menuStatus ? { menuStatus: input.menuStatus } : {}),
    inclusions: JSON.stringify(input.inclusions),
    ticketPriceCents: Math.round(input.ticketPriceDollars * 100),
    durationMinutes: input.durationMinutes,
    defaultCapacity: input.sessions[0]?.capacity ?? 12,
    venueId: venue.id,
    cancellationPolicyId: policy.id,
    isFictional: false,
  };

  return db.$transaction(async (tx) => {
    let exp;
    if (experienceId) {
      const current = await tx.experience.findUniqueOrThrow({ where: { id: experienceId } });
      exp = await tx.experience.update({
        where: { id: experienceId },
        data: {
          ...data,
          slug: current.title === input.title ? current.slug : await uniqueSlug(db, input.title, experienceId),
          ...(wantsPublish ? { status: "PUBLISHED", publishedAt: current.publishedAt ?? now } : current.status === "PUBLISHED" ? {} : { status: "DRAFT" }),
        },
      });
    } else {
      exp = await tx.experience.create({
        data: { ...data, slug: await uniqueSlug(db, input.title), hostId, status: wantsPublish ? "PUBLISHED" : "DRAFT", publishedAt: wantsPublish ? now : null, createdAt: now },
      });
    }

    await writeStructuredContent(tx, exp.id, input);

    // Photos: replace.
    await tx.experiencePhoto.deleteMany({ where: { experienceId: exp.id } });
    if (input.photos.length) {
      await tx.experiencePhoto.createMany({ data: input.photos.map((p, i) => ({ experienceId: exp.id, url: p.url, alt: p.alt, sortOrder: i, credit: "Host-provided" })) });
    }

    // Sessions: update existing, create new, delete removed ones without bookings.
    const existing = await tx.experienceSession.findMany({ where: { experienceId: exp.id }, include: { _count: { select: { bookings: true } } } });
    const keepIds = new Set(input.sessions.map((s) => s.id).filter(Boolean));
    for (const s of existing) {
      if (keepIds.has(s.id)) continue;
      if (s._count.bookings > 0) throw new DomainError("A date with bookings can't be removed. Cancel the event instead, which refunds guests.");
      await tx.experienceSession.delete({ where: { id: s.id } });
    }
    for (const s of input.sessions) {
      const [h, m] = s.time.split(":").map(Number);
      const startsAt = nyDateTime(s.date, h, m);
      const endsAt = new Date(startsAt.getTime() + input.durationMinutes * 60_000);
      if (s.id) {
        const cur = existing.find((x) => x.id === s.id);
        if (!cur) throw new DomainError("Unknown session.", "NOT_FOUND");
        if (s.capacity < cur.seatsReserved) throw new DomainError(`Capacity can't be lower than the ${cur.seatsReserved} seats already sold.`);
        await tx.experienceSession.update({ where: { id: s.id }, data: { startsAt, endsAt, capacity: s.capacity } });
      } else {
        await tx.experienceSession.create({ data: { experienceId: exp.id, startsAt, endsAt, capacity: s.capacity } });
      }
    }
    return exp;
  });
}

type Tx = Parameters<Parameters<Db["$transaction"]>[0]>[0];

/**
 * Menu sections, featured dishes and itinerary. Sections are always rewritten (from the legacy
 * flat menu when the client didn't send sections), so both representations stay in sync.
 * Itinerary and featured dishes only change when the client sends them.
 */
async function writeStructuredContent(tx: Tx, experienceId: string, input: EventInput) {
  const sections = input.menuSections ?? sectionsFromLegacyMenu(input.menu);
  await tx.experienceMenuSection.deleteMany({ where: { experienceId } });
  for (const [i, section] of sections.entries()) {
    await tx.experienceMenuSection.create({
      data: {
        experienceId,
        title: section.title,
        description: section.description,
        sortOrder: i,
        items: {
          create: section.items.map((item, j) => ({
            name: item.name,
            description: item.description,
            dishKey: item.dish ? (normalizeDish({ key: item.dish, custom: item.dish })?.dishKey ?? null) : null,
            dietaryTags: serializeList(item.dietaryTags),
            imageUrl: item.imageUrl ?? null,
            imageAlt: item.imageAlt ?? null,
            sortOrder: j,
          })),
        },
      },
    });
  }
  if (input.itinerary) {
    await tx.experienceItineraryStep.deleteMany({ where: { experienceId } });
    if (input.itinerary.length) {
      await tx.experienceItineraryStep.createMany({
        data: input.itinerary.map((step, i) => ({
          experienceId,
          sortOrder: i,
          startOffsetMinutes: step.startOffsetMinutes,
          durationMinutes: stepDuration(step),
          title: step.title,
          description: step.description,
        })),
      });
    }
  }
  if (input.featuredDishes) {
    const dishes = normalizeDishList(input.featuredDishes.map((d) => ({ key: d, custom: d })));
    await tx.experienceDish.deleteMany({ where: { experienceId } });
    if (dishes.length) {
      await tx.experienceDish.createMany({ data: dishes.map((d, i) => ({ experienceId, dishKey: d.dishKey, customName: d.customName, isCustom: d.isCustom, sortOrder: i })) });
    }
  }
}

export async function duplicateEvent(db: Db, hostId: string, experienceId: string, now: Date) {
  await assertOwnsExperience(db, hostId, experienceId);
  const src = await db.experience.findUniqueOrThrow({
    where: { id: experienceId },
    include: { photos: true, featuredDishes: true, itinerary: true, menuSections: { include: { items: true } } },
  });
  const { id: _id, slug: _slug, createdAt: _c, updatedAt: _u, publishedAt: _p, status: _s, featured: _f, photos: _ph, featuredDishes: _fd, itinerary: _it, menuSections: _ms, ...rest } = src;
  void _id; void _slug; void _c; void _u; void _p; void _s; void _f; void _ph; void _fd; void _it; void _ms;
  return db.experience.create({
    data: {
      ...rest,
      saveCount: 0,
      title: `${src.title} (copy)`,
      slug: await uniqueSlug(db, `${src.title} copy`),
      status: "DRAFT",
      featured: false,
      isFictional: false,
      createdAt: now,
    },
  }).then(async (copy) => {
    if (src.photos.length) {
      await db.experiencePhoto.createMany({ data: src.photos.map((p) => ({ experienceId: copy.id, url: p.url, alt: p.alt, credit: p.credit, sortOrder: p.sortOrder })) });
    }
    if (src.featuredDishes.length) {
      await db.experienceDish.createMany({ data: src.featuredDishes.map((d) => ({ experienceId: copy.id, dishKey: d.dishKey, customName: d.customName, isCustom: d.isCustom, sortOrder: d.sortOrder })) });
    }
    if (src.itinerary.length) {
      await db.experienceItineraryStep.createMany({
        data: src.itinerary.map((s) => ({ experienceId: copy.id, sortOrder: s.sortOrder, startOffsetMinutes: s.startOffsetMinutes, durationMinutes: s.durationMinutes, title: s.title, description: s.description })),
      });
    }
    for (const section of src.menuSections) {
      await db.experienceMenuSection.create({
        data: {
          experienceId: copy.id,
          title: section.title,
          description: section.description,
          sortOrder: section.sortOrder,
          items: { create: section.items.map(({ id: _i, sectionId: _s2, ...item }) => (void _i, void _s2, item)) },
        },
      });
    }
    return copy;
  });
}

export async function setPublication(db: Db, hostId: string, experienceId: string, status: "PUBLISHED" | "UNPUBLISHED", now: Date) {
  const exp = await assertOwnsExperience(db, hostId, experienceId);
  if (exp.status === "CANCELLED") throw new DomainError("Cancelled events can't be republished. Duplicate it instead.", "CONFLICT");
  if (status === "PUBLISHED") {
    const full = await db.experience.findUniqueOrThrow({
      where: { id: experienceId },
      include: { venue: true, photos: true, sessions: { where: { startsAt: { gt: now }, status: "SCHEDULED" } } },
    });
    const problems: string[] = [];
    if (full.venue.isPlaceholder) problems.push("Add a confirmed venue before publishing.");
    if (!full.sessions.length) problems.push("Add at least one future date.");
    if (!full.photos.length) problems.push("Add at least one photo.");
    if (problems.length) throw new DomainError(problems.join(" "));
  }
  return db.experience.update({
    where: { id: experienceId },
    data: { status, ...(status === "PUBLISHED" ? { publishedAt: now } : {}) },
  });
}

/** Cancels an event: every future session is cancelled and every active booking fully refunded. */
export async function cancelEvent(db: Db, hostId: string, experienceId: string, now: Date) {
  await assertOwnsExperience(db, hostId, experienceId);
  const bookings = await db.booking.findMany({
    where: { session: { experienceId, startsAt: { gt: now } }, status: { in: ["CONFIRMED", "PENDING"] } },
    select: { id: true },
  });
  for (const b of bookings) {
    await cancelBooking(db, { bookingId: b.id, actor: "HOST", hostId, reason: "Event cancelled by host" }, now);
  }
  await db.experienceSession.updateMany({ where: { experienceId, startsAt: { gt: now } }, data: { status: "CANCELLED" } });
  await db.waitlistEntry.updateMany({ where: { session: { experienceId }, status: { in: ["WAITING", "NOTIFIED"] } }, data: { status: "CANCELLED" } });
  await db.experience.update({ where: { id: experienceId }, data: { status: "CANCELLED" } });
  return { refundedBookings: bookings.length };
}

/** Demo QR check-in. Only tickets for the host's own sessions; repeat scans are reported, not errors. */
export async function checkInTicket(db: Db, hostId: string, rawCode: string, now: Date) {
  const code = rawCode.trim().toUpperCase().replace(/^TASTABLE:/, "");
  const ticket = await db.bookingTicket.findUnique({
    where: { code },
    include: { booking: { include: { session: { include: { experience: { select: { hostId: true, title: true } } } } } } },
  });
  if (!ticket || ticket.booking.session.experience.hostId !== hostId) {
    return { ok: false as const, message: "Ticket not found for your events." };
  }
  const label = `${ticket.attendeeName ?? ticket.booking.contactName} · ${ticket.booking.session.experience.title}`;
  if (ticket.status === "CANCELLED" || ticket.booking.status === "CANCELLED") return { ok: false as const, message: `Cancelled ticket: ${label}` };
  if (ticket.status === "CHECKED_IN") return { ok: true as const, already: true, message: `Already checked in: ${label}` };
  await db.bookingTicket.update({ where: { id: ticket.id }, data: { status: "CHECKED_IN", checkedInAt: now } });
  return { ok: true as const, already: false, message: `Checked in: ${label}` };
}
