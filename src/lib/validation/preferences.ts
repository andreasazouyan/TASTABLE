import { z } from "zod";

import { CATEGORY_IDS } from "@/lib/domain/categories";
import { NEIGHBORHOODS } from "@/lib/domain/neighborhoods";
import { MAX_CUSTOM_DISH_LENGTH, MAX_FAVORITE_DISHES } from "@/lib/domain/dishes";
import { ATTENDANCE_IDS, DAY_KEYS, MAX_PREFERRED_CATEGORIES, OPEN_TO_EVERYTHING, PREFERENCE_CUISINE_KEYS, TIME_SLOT_KEYS } from "@/lib/domain/preferences";
import { MOTIVATION_KEYS } from "@/lib/domain/taxonomy";

const locationKeys = ["nyc", ...NEIGHBORHOODS.map((n) => n.key)] as [string, ...string[]];

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
