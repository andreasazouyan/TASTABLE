import { z } from "zod";

import { DIETARY_OPTIONS } from "@/lib/domain/taxonomy";

/**
 * Structured event content: menu sections, itinerary steps and featured dishes.
 * The legacy flat `Experience.menu` JSON is derived from the sections so existing pages keep working.
 */

const dietaryKeys = DIETARY_OPTIONS.map((d) => d.key) as [string, ...string[]];

export const menuItemInput = z.object({
  name: z.string().trim().min(1, "Name each menu item").max(100),
  description: z.string().trim().max(300).default(""),
  /** Catalog key or free text; normalized with normalizeDish on save. */
  dish: z.string().trim().max(60).optional(),
  dietaryTags: z.array(z.enum(dietaryKeys)).max(8).default([]),
  imageUrl: z.url("Menu images must be a full https URL").optional(),
  imageAlt: z.string().trim().max(160).optional(),
});

export const menuSectionInput = z.object({
  /** Course or section name, e.g. "Welcome drink", "Starter", "What you'll cook". */
  title: z.string().trim().min(1, "Name each menu section").max(80),
  description: z.string().trim().max(300).default(""),
  items: z.array(menuItemInput).min(1, "Add at least one item to each menu section").max(20),
});

export const menuSectionsInput = z.array(menuSectionInput).max(12);
export type MenuSectionInput = z.infer<typeof menuSectionInput>;

export const MENU_STATUSES = {
  FINAL: "Final menu",
  SUBJECT_TO_CHANGE: "Menu subject to change",
  TO_BE_ANNOUNCED: "Menu to be announced",
} as const;
export const MENU_STATUS_IDS = Object.keys(MENU_STATUSES) as [keyof typeof MENU_STATUSES, ...(keyof typeof MENU_STATUSES)[]];

/** One itinerary step, as minutes from the session start (so it applies to every session). */
export const itineraryStepInput = z
  .object({
    startOffsetMinutes: z.coerce.number().int().min(0).max(24 * 60),
    endOffsetMinutes: z.coerce.number().int().min(1).max(24 * 60).nullable().default(null),
    title: z.string().trim().min(1, "Give each step a title").max(100),
    description: z.string().trim().max(400).default(""),
  })
  .refine((s) => s.endOffsetMinutes === null || s.endOffsetMinutes > s.startOffsetMinutes, {
    message: "A step must end after it starts",
    path: ["endOffsetMinutes"],
  });
export type ItineraryStepInput = z.infer<typeof itineraryStepInput>;

/**
 * Chronology rules: steps are in start order, no step starts before the previous one ends, and
 * nothing runs past the event's duration. Returns human-readable problems (empty = valid).
 */
export function itineraryProblems(steps: ItineraryStepInput[], durationMinutes?: number) {
  const problems: string[] = [];
  steps.forEach((s, i) => {
    const prev = steps[i - 1];
    if (prev && s.startOffsetMinutes < prev.startOffsetMinutes) problems.push(`Step ${i + 1} starts before step ${i}. Keep the itinerary in order.`);
    else if (prev?.endOffsetMinutes != null && s.startOffsetMinutes < prev.endOffsetMinutes) problems.push(`Step ${i + 1} starts before step ${i} ends.`);
    const end = s.endOffsetMinutes ?? s.startOffsetMinutes;
    if (durationMinutes !== undefined && end > durationMinutes) problems.push(`Step ${i + 1} runs past the end of the event.`);
  });
  return problems;
}

export const itineraryInput = z
  .array(itineraryStepInput)
  .max(20)
  .superRefine((steps, ctx) => {
    for (const message of itineraryProblems(steps)) ctx.addIssue({ code: "custom", message });
  });

/** The legacy flat menu ({ title, description }[]) shown by existing pages. */
export function legacyMenuFromSections(sections: MenuSectionInput[]) {
  return sections.flatMap((s) =>
    s.items.map((item) => ({
      title: sections.length > 1 || s.title !== "Menu" ? `${s.title}: ${item.name}` : item.name,
      description: item.description,
    })),
  );
}

/** Wrap a legacy flat menu as a single "Menu" section (same rule as the backfill migration). */
export function sectionsFromLegacyMenu(menu: { title: string; description?: string }[]): MenuSectionInput[] {
  const items = menu.filter((m) => m.title.trim()).map((m) => ({ name: m.title, description: m.description ?? "", dietaryTags: [] }));
  return items.length ? [{ title: "Menu", description: "", items }] : [];
}

/** End offset stored as a duration (the table keeps start + optional duration). */
export function stepDuration(step: ItineraryStepInput) {
  return step.endOffsetMinutes === null ? null : step.endOffsetMinutes - step.startOffsetMinutes;
}
