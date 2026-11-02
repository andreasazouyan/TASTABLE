import { z } from "zod";

import { CATEGORY_IDS } from "@/lib/domain/categories";
import { NEIGHBORHOODS } from "@/lib/domain/neighborhoods";
import { CUISINE_KEYS, DIETARY_OPTIONS, FORMAT_IDS, HOST_TYPE_IDS, OCCASION_KEYS } from "@/lib/domain/taxonomy";

const neighborhoodKeys = NEIGHBORHOODS.map((n) => n.key) as [string, ...string[]];
const dietaryKeys = DIETARY_OPTIONS.map((d) => d.key) as [string, ...string[]];
const venueTypes = ["RESTAURANT", "PRIVATE_HOME", "LOFT", "ROOFTOP", "STUDIO_KITCHEN", "GALLERY", "BAR", "OUTDOOR", "SECRET_LOCATION"] as const;

export const sessionInput = z.object({
  id: z.string().optional(),
  date: z.iso.date("Pick a date"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Pick a start time"),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1").max(500),
});

export const policyInput = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("template"), templateId: z.string().min(1) }),
  z.object({
    mode: z.literal("custom"),
    fullRefundHours: z.coerce.number().int().min(0).max(24 * 60),
    partialRefundHours: z.coerce.number().int().min(0).max(24 * 60).nullable(),
    partialRefundPercent: z.coerce.number().int().min(0).max(100),
  }),
]);

export const venueInput = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("existing"), venueId: z.string().min(1, "Choose a venue") }),
  z.object({
    mode: z.literal("new"),
    name: z.string().trim().min(2, "Venue name is required").max(80),
    type: z.enum(venueTypes),
    neighborhood: z.enum(neighborhoodKeys),
    addressLine: z.string().trim().min(3, "Address is required").max(160),
    maxCapacity: z.coerce.number().int().min(1).max(1000),
    isSecretLocation: z.boolean().default(false),
  }),
  z.object({ mode: z.literal("tbc") }),
]);

/** The full event form. Validated on the server for both drafts and publishing. */
export const eventInput = z.object({
  title: z.string().trim().min(4, "Give your event a title").max(90),
  summary: z.string().trim().min(10, "Add a one-line summary").max(160),
  description: z.string().trim().min(30, "Describe the experience (30+ characters)").max(4000),
  category: z.enum(CATEGORY_IDS, "Choose one of the four categories"),
  cuisine: z.enum(CUISINE_KEYS),
  tags: z.array(z.string().trim().toLowerCase().min(1).max(30)).max(8).default([]),
  format: z.enum(FORMAT_IDS),
  occasions: z.array(z.enum(OCCASION_KEYS)).default([]),
  socialAtmosphere: z.enum(["MEET_NEW_PEOPLE", "BRING_YOUR_PEOPLE", "EITHER_WAY"]),
  photos: z.array(z.object({ url: z.url("Photo must be a full https URL"), alt: z.string().trim().min(3, "Describe each photo").max(160) })).max(6).default([]),
  venue: venueInput,
  sessions: z.array(sessionInput).max(20).default([]),
  ticketPriceDollars: z.coerce.number().min(5, "Minimum ticket price is $5").max(2000),
  durationMinutes: z.coerce.number().int().min(30).max(720),
  highlights: z.array(z.string().trim().min(1).max(120)).max(6).default([]),
  menu: z.array(z.object({ title: z.string().trim().min(1).max(80), description: z.string().trim().max(200).default("") })).max(15).default([]),
  inclusions: z.array(z.string().trim().min(1).max(120)).max(10).default([]),
  dietaryOptions: z.array(z.enum(dietaryKeys)).default([]),
  policy: policyInput,
  intent: z.enum(["draft", "publish"]),
});

export type EventInput = z.infer<typeof eventInput>;

/** Extra rules that only apply when publishing. Returns a list of human-readable problems. */
export function publishProblems(e: Pick<EventInput, "venue" | "sessions" | "photos" | "menu">, venueIsPlaceholder = false) {
  const problems: string[] = [];
  if (e.venue.mode === "tbc" || venueIsPlaceholder) problems.push("Add a confirmed venue before publishing (venue requests don't secure a venue).");
  if (!e.sessions.length) problems.push("Add at least one date and time.");
  if (!e.photos.length) problems.push("Add at least one photo.");
  if (!e.menu.length) problems.push("Add the menu or activities.");
  return problems;
}

export const hostProfileInput = z.object({
  hostType: z.enum(HOST_TYPE_IDS, "Choose the type of host you are"),
  displayName: z.string().trim().min(2, "Enter your host name").max(60),
  tagline: z.string().trim().min(5, "Add a short tagline").max(100),
  bio: z.string().trim().min(20, "Tell guests a little about you (20+ characters)").max(1500),
  background: z.string().trim().min(5, "Add your culinary background").max(200),
  cuisineExpertise: z.array(z.enum(CUISINE_KEYS)).min(1, "Pick at least one cuisine"),
  homeNeighborhood: z.enum(neighborhoodKeys, "Choose your neighborhood"),
  profilePhotoUrl: z.union([z.literal(""), z.url("Use a full https URL")]).default(""),
  credentials: z.string().trim().max(1000).default(""),
  instagramHandle: z.string().trim().max(40).default(""),
});

export const venueRequestInput = z.object({
  neighborhoods: z.array(z.enum(neighborhoodKeys)).min(1, "Pick at least one neighborhood"),
  guestCount: z.coerce.number().int().min(2).max(500),
  preferredDates: z.string().trim().min(3, "Tell us roughly when").max(200),
  budgetDollars: z.union([z.literal(""), z.coerce.number().min(0).max(100000)]).default(""),
  needsKitchen: z.boolean().default(true),
  notes: z.string().trim().max(1000).default(""),
});

export const expenseInput = z.object({
  id: z.string().optional(),
  experienceId: z.string().min(1, "Choose an event"),
  sessionId: z.string().optional().default(""),
  category: z.enum(["INGREDIENTS", "BEVERAGES", "VENUE", "STAFF", "EQUIPMENT", "MARKETING", "OTHER"]),
  description: z.string().trim().min(2, "Describe the expense").max(120),
  amountDollars: z.coerce.number().positive("Amount must be more than $0").max(100000),
  incurredOn: z.iso.date("Pick a date"),
});
