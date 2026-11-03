import { z } from "zod";

import { CATEGORY_IDS } from "@/lib/domain/categories";
import { NEIGHBORHOODS } from "@/lib/domain/neighborhoods";
import { MAX_CUSTOM_DISH_LENGTH, MAX_FAVORITE_DISHES } from "@/lib/domain/dishes";
import { ATTENDANCE_IDS, DAY_KEYS, MAX_PREFERRED_CATEGORIES, OPEN_TO_EVERYTHING, PREFERENCE_CUISINE_KEYS, TIME_SLOT_KEYS } from "@/lib/domain/preferences";
import { CUISINE_KEYS, MOTIVATION_KEYS } from "@/lib/domain/taxonomy";

const locationKeys = ["nyc", ...NEIGHBORHOODS.map((n) => n.key)] as [string, ...string[]];

export const preferencesSchema = z.object({
  locationKey: z.enum(locationKeys).default("nyc"),
  travelRadiusMiles: z
    .union([z.literal(""), z.literal("any"), z.coerce.number().int().refine((n) => [2, 5, 10].includes(n))])
    .transform((v) => (v === "" || v === "any" ? null : v))
    .default(null),
  cuisines: z.array(z.enum(CUISINE_KEYS)).max(12).default([]),
  categories: z.array(z.enum(CATEGORY_IDS)).max(4).default([]),
  motivations: z.array(z.enum(MOTIVATION_KEYS)).max(7).default([]),
  maxBudgetDollars: z
    .union([z.literal(""), z.literal("any"), z.coerce.number().int().refine((n) => [60, 100, 150].includes(n))])
    .transform((v) => (v === "" || v === "any" ? null : v))
    .default(null),
});

export type PreferencesInput = z.infer<typeof preferencesSchema>;

export function preferencesFromFormData(fd: FormData) {
  return preferencesSchema.safeParse({
    locationKey: fd.get("locationKey") || "nyc",
    travelRadiusMiles: fd.get("travelRadiusMiles") ?? "",
    cuisines: fd.getAll("cuisines").map(String),
    categories: fd.getAll("categories").map(String),
    motivations: fd.getAll("motivations").map(String),
    maxBudgetDollars: fd.get("maxBudgetDollars") ?? "",
  });
}

// ─── Full preference model (onboarding v2, profile editing, services) ─────────────────────────

/**
 * Every guest preference, each field optional: a save only touches the fields it includes, so a
 * partial onboarding step can never wipe answers given on another step. Arrays replace the
 * stored list; null clears a single-value answer.
 */
export const guestPreferencesPatch = z
  .object({
    /** Primary NYC neighborhood key, or "nyc" for none. */
    locationKey: z.enum(locationKeys),
    maxTravelMinutes: z.union([z.literal(20), z.literal(30), z.literal(45)]).nullable(),
    preferredDays: z.array(z.enum(DAY_KEYS)).max(7),
    preferredTimes: z.array(z.enum(TIME_SLOT_KEYS)).max(TIME_SLOT_KEYS.length),
    attendancePreference: z.enum(ATTENDANCE_IDS).nullable(),
    categories: z.array(z.enum(CATEGORY_IDS)).max(MAX_PREFERRED_CATEGORIES, `Choose up to ${MAX_PREFERRED_CATEGORIES} experience types`),
    cuisines: z
      .array(z.enum(PREFERENCE_CUISINE_KEYS))
      .max(PREFERENCE_CUISINE_KEYS.length)
      .refine((c) => !c.includes(OPEN_TO_EVERYTHING) || c.length === 1, "“Open to everything” can't be combined with specific cuisines"),
    /** Catalog keys ({ key }) or custom text ({ custom }), normalized by the service. */
    favoriteDishes: z
      .array(z.union([z.object({ key: z.string().trim().min(1).max(80) }), z.object({ custom: z.string().trim().min(1).max(MAX_CUSTOM_DISH_LENGTH) })]))
      .max(MAX_FAVORITE_DISHES, `Choose up to ${MAX_FAVORITE_DISHES} dishes`),
    motivations: z.array(z.enum(MOTIVATION_KEYS)).max(MOTIVATION_KEYS.length),
    maxBudgetCents: z.number().int().min(0).max(1_000_000).nullable(),
  })
  .partial()
  .strict();

export type GuestPreferencesPatch = z.infer<typeof guestPreferencesPatch>;
