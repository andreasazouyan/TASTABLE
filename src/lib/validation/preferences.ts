import { z } from "zod";

import { CATEGORY_IDS } from "@/lib/domain/categories";
import { NEIGHBORHOODS } from "@/lib/domain/neighborhoods";
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
