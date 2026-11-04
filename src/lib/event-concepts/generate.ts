import { z } from "zod";

import type { ExperienceCategory } from "@/generated/prisma/enums";
import { CATEGORY_IDS, getCategory } from "@/lib/domain/categories";
import { DISHES, getDish } from "@/lib/domain/dishes";
import { itineraryInput, menuSectionsInput } from "@/lib/domain/event-content";
import { getNeighborhood, NEIGHBORHOODS } from "@/lib/domain/neighborhoods";
import { ATTENDANCE, DAYS, DAY_KEYS, TIME_SLOT_KEYS, TIME_SLOT_PREFS } from "@/lib/domain/preferences";
import { CUISINE_KEYS, FORMAT_IDS, OCCASION_KEYS, cuisineLabel, type CuisineKey } from "@/lib/domain/taxonomy";
import { formatPercent } from "@/lib/format";

/**
 * AI-assisted event creation, DEMO GENERATOR.
 *
 * Tastable has no AI provider configured, so concepts come from this deterministic, rule-based
 * generator. It reads only the aggregated, privacy-thresholded demand summary
 * (getEventCreationContext) and the host's inputs. The same inputs always give the same concept;
 * "Regenerate" moves to the next-best option by bumping `variant`. It is labelled as rule-based
 * everywhere it appears and never publishes anything: the host reviews and edits every field.
 */

export const CONCEPT_SOURCE = "rule-based-demo" as const;

const neighborhoodKeys = NEIGHBORHOODS.map((n) => n.key) as [string, ...string[]];

export const conceptRequest = z
  .object({
    neighborhood: z.union([z.literal(""), z.enum(neighborhoodKeys)]).default(""),
    category: z.union([z.literal(""), z.enum(CATEGORY_IDS)]).default(""),
    priceMin: z.coerce.number().int().min(5, "Minimum price is $5").max(2000),
    priceMax: z.coerce.number().int().min(5).max(2000),
    capacity: z.coerce.number().int().min(2, "At least 2 guests").max(200, "At most 200 guests"),
    theme: z.string().trim().max(120, "Keep the theme under 120 characters").default(""),
    variant: z.coerce.number().int().min(0).max(1000).default(0),
  })
  .refine((r) => r.priceMax >= r.priceMin, { message: "The highest price must be at least the lowest", path: ["priceMax"] });
export type ConceptRequest = z.infer<typeof conceptRequest>;

/** Structured output. Generated concepts are validated against this before anyone sees them. */
export const eventConcept = z.object({
  source: z.literal(CONCEPT_SOURCE),
  title: z.string().min(4).max(90),
  summary: z.string().min(10).max(160),
  description: z.string().min(30).max(4000),
  category: z.enum(CATEGORY_IDS),
  cuisine: z.enum(CUISINE_KEYS),
  format: z.enum(FORMAT_IDS),
  occasions: z.array(z.enum(OCCASION_KEYS)).max(5),
  featuredDishes: z.array(z.string().min(1).max(60)).min(1).max(4),
  menuSections: menuSectionsInput.min(1),
  itinerary: itineraryInput.min(2),
  durationMinutes: z.number().int().min(30).max(720),
  price: z.object({ min: z.number().int(), max: z.number().int(), suggested: z.number().int() }),
  groupSize: z.object({ min: z.number().int().min(1), max: z.number().int().min(1) }),
  day: z.enum(DAY_KEYS),
  timeSlot: z.enum(TIME_SLOT_KEYS),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  socialAtmosphere: z.enum(["MEET_NEW_PEOPLE", "BRING_YOUR_PEOPLE", "EITHER_WAY"]),
  atmosphereNote: z.string().min(1).max(300),
  tags: z.array(z.string().min(1).max(30)).max(8),
  rationale: z.array(z.string().min(1).max(300)).min(1).max(10),
});
export type EventConcept = z.infer<typeof eventConcept>;

type B = { key: string; guests: number; share: number };
/** The aggregated, privacy-safe demand summary (shape of getEventCreationContext()). */
export type DemandContext = {
  dataSource: "simulated" | "live" | "mixed";
  eligibleGuests: number;
  segment: { allowed: false; minimum: number } | { allowed: true; guests: number };
  topCategories: B[];
  topCuisines: B[];
  topDishes: B[];
  topDays: B[];
  topTimes: B[];
  topNeighborhoods: B[];
  attendance: B[];
  categoryByCuisine: { cuisine: string; category: string; guests: number }[];
};

const CATEGORY_DEFAULTS: Record<ExperienceCategory, { duration: number; basePrice: number; format: EventConcept["format"]; groupMax: number }> = {
  COOKING_CLASS_WORKSHOP: { duration: 240, basePrice: 95, format: "HANDS_ON_CLASS", groupMax: 16 },
  SUPPER_CLUB_PRIVATE_DINING: { duration: 180, basePrice: 125, format: "SEATED_DINNER", groupMax: 20 },
  POPUP_EXCLUSIVE: { duration: 150, basePrice: 70, format: "TASTING", groupMax: 40 },
  SOCIAL_CULINARY: { duration: 180, basePrice: 55, format: "STANDING_RECEPTION", groupMax: 30 },
};

/** Singular nouns for sentences ("a Saturday evening cooking class"). */
const CATEGORY_NOUN: Record<ExperienceCategory, string> = {
  COOKING_CLASS_WORKSHOP: "cooking class",
  SUPPER_CLUB_PRIVATE_DINING: "supper club",
  POPUP_EXCLUSIVE: "pop-up",
  SOCIAL_CULINARY: "food social",
};

const FALLBACK_DISHES: Record<string, string[]> = { global: ["tasting-menu", "cheese-board"] };
/** Long formats shouldn't run past this (minutes after midnight): 11 PM. */
const LATEST_END = 23 * 60;
const SWEET = new Set(["ice-cream", "dessert", "pastries", "tiramisu", "croissant", "souffle"]);

/** How a dish reads in a given cuisine ("Ice cream" becomes "Gelato" at an Italian night). */
function dishName(key: string, cuisine: string) {
  if (key === "ice-cream" && cuisine === "italian") return "Gelato";
  return getDish(key)?.label ?? key;
}

const pct = (b: { guests: number }, size: number) => (size ? ` (${b.guests} of ${size} guests, ${formatPercent(b.guests / size)})` : "");
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

function hhmm(minutes: number) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function clock(minutes: number) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** Words from the theme that match a cuisine or dish, so a host's direction steers the concept. */
function themeHints(theme: string) {
  const t = theme.toLowerCase();
  const cuisines = CUISINE_KEYS.filter((k) => k !== "global" && t.includes(cuisineLabel(k).toLowerCase()));
  const dishes = DISHES.filter((d) => [d.label, ...(d.aliases ?? [])].some((a) => t.includes(a.toLowerCase()))).map((d) => d.key);
  return { cuisines, dishes };
}

export function generateEventConcept(ctx: DemandContext, req: ConceptRequest): EventConcept {
  const size = ctx.segment.allowed ? ctx.segment.guests : 0;
  const hasData = ctx.segment.allowed && (ctx.topCuisines.length > 0 || ctx.topDishes.length > 0);
  const hints = themeHints(req.theme);
  const rationale: string[] = [];

  // 1. Category: the host's choice, otherwise the most-wanted ones in turn.
  const demandCats = ctx.topCategories.map((c) => c.key).filter((k): k is ExperienceCategory => (CATEGORY_IDS as readonly string[]).includes(k));
  const category: ExperienceCategory = req.category || demandCats[req.variant % Math.max(1, demandCats.length)] || "SUPPER_CLUB_PRIVATE_DINING";
  const catMeta = getCategory(category);
  const catBucket = ctx.topCategories.find((c) => c.key === category);
  if (catBucket) rationale.push(`${catMeta.name} interests ${catBucket.guests} of ${size} guests (${formatPercent(catBucket.guests / size)}).`);

  // 2. Cuisine: stated cuisine demand + demand for its dishes + fans of this category, plus theme.
  const dishCuisine = (k: string) => getDish(k)?.cuisine as string | undefined;
  const scored = CUISINE_KEYS.filter((k) => k !== "global")
    .map((k) => {
      const stated = ctx.topCuisines.find((c) => c.key === k)?.guests ?? 0;
      const dishes = ctx.topDishes.filter((d) => dishCuisine(d.key) === k).reduce((n, d) => n + d.guests, 0);
      const fans = ctx.categoryByCuisine.find((c) => c.cuisine === k && c.category === category)?.guests ?? 0;
      const theme = hints.cuisines.includes(k) || hints.dishes.some((d) => dishCuisine(d) === k) ? 1000 : 0;
      return { key: k as CuisineKey, score: stated + dishes + fans + theme, stated, fans };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
  const pick = scored.length ? scored[(req.category ? req.variant : Math.floor(req.variant / Math.max(1, demandCats.length))) % scored.length] : null;
  const cuisine: CuisineKey = pick?.key ?? "global";
  const cuisineName = cuisineLabel(cuisine);
  if (pick?.stated) {
    const b = ctx.topCuisines.find((c) => c.key === cuisine)!;
    rationale.push(`${cuisineName} cuisine is chosen by ${b.guests} guests (${formatPercent(b.guests / size)}).`);
  }
  if (pick?.fans) rationale.push(`${pick.fans} guests who like ${cuisineName} food also chose ${catMeta.name}.`);
  if (hints.cuisines.length || hints.dishes.length) rationale.push(`Your creative direction ("${req.theme}") steered the cuisine and dishes.`);

  // 3. Featured dishes: requested dishes of this cuisine, then a requested sweet finish, then the catalog.
  const requested = ctx.topDishes.filter((d) => dishCuisine(d.key) === cuisine);
  const sweet = ctx.topDishes.find((d) => SWEET.has(d.key) && !requested.some((r) => r.key === d.key));
  const themed = hints.dishes.filter((k) => dishCuisine(k) === cuisine || SWEET.has(k));
  const catalog = [...DISHES.filter((d) => d.cuisine === cuisine).map((d) => d.key), ...(FALLBACK_DISHES[cuisine] ?? [])];
  const savory = [...new Set([...themed.filter((k) => !SWEET.has(k)), ...requested.map((d) => d.key).filter((k) => !SWEET.has(k)), ...catalog.filter((k) => !SWEET.has(k))])];
  const sweetKey = themed.find((k) => SWEET.has(k)) ?? sweet?.key ?? requested.find((d) => SWEET.has(d.key))?.key ?? catalog.find((k) => SWEET.has(k));
  const mains = savory.slice(0, category === "COOKING_CLASS_WORKSHOP" ? 1 : 2);
  // No requested or native sweet: pair with the next savory dish rather than a generic "dessert".
  const isSweet = sweetKey !== undefined;
  const dessert = sweetKey ?? savory[mains.length] ?? "cheese-board";
  const featuredKeys = [...mains, dessert].slice(0, 4);
  const [mainKey] = featuredKeys;
  const main = dishName(mainKey, cuisine);
  const sweetName = dishName(dessert, cuisine);
  for (const k of featuredKeys) {
    const b = ctx.topDishes.find((d) => d.key === k);
    if (b) rationale.push(`${dishName(k, cuisine)} is a requested favorite${pct(b, size)}.`);
  }

  // 4. When: the most preferred day, and the most preferred time slot that fits the format before 11 PM.
  const d = CATEGORY_DEFAULTS[category];
  const day = (ctx.topDays[0]?.key as EventConcept["day"]) ?? "SAT";
  const slots = ctx.topTimes.map((t) => ({ bucket: t, slot: TIME_SLOT_PREFS.find((x) => x.key === t.key)! })).filter((x) => x.slot);
  const fitting = slots.find((x) => x.slot.start * 60 + d.duration <= LATEST_END) ?? slots[0];
  const slot = fitting?.slot ?? TIME_SLOT_PREFS.find((t) => t.key === "18-20")!;
  const timeSlot = slot.key as EventConcept["timeSlot"];
  const dayName = DAYS.find((x) => x.key === day)!.label;
  if (ctx.topDays[0]) rationale.push(`${dayName} is the most preferred day${pct(ctx.topDays[0], size)}.`);
  if (fitting) {
    rationale.push(
      fitting === slots[0]
        ? `${slot.label} is the most preferred time slot${pct(fitting.bucket, size)}.`
        : `${slot.label} is also a top time slot${pct(fitting.bucket, size)} and lets a ${Math.round(d.duration / 60)}-hour event end by 11 PM (${slots[0].slot.label} is the most preferred${pct(slots[0].bucket, size)}).`,
    );
  }

  // 5. Social atmosphere from how guests like to attend.
  const tied = ctx.attendance.length > 1 && ctx.attendance[0].guests === ctx.attendance[1].guests;
  const att = tied ? "DEPENDS" : (ctx.attendance[0]?.key as keyof typeof ATTENDANCE | undefined);
  const socialAtmosphere: EventConcept["socialAtmosphere"] = att === "SOLO" ? "MEET_NEW_PEOPLE" : att === "FRIENDS_OR_PARTNER" ? "BRING_YOUR_PEOPLE" : "EITHER_WAY";
  const atmosphereNote =
    socialAtmosphere === "MEET_NEW_PEOPLE"
      ? "Shared tables and a mixer-style start, so guests coming on their own feel at home."
      : socialAtmosphere === "BRING_YOUR_PEOPLE"
        ? "Stations and tables for pairs and small groups: easy to book with a friend or partner."
        : "Shared stations, with seats for pairs and small groups, so it works for everyone.";
  if (tied) rationale.push(`Guests are split on how they like to attend (${ctx.attendance.map((a) => `${lower(ATTENDANCE[a.key as keyof typeof ATTENDANCE]?.label ?? a.key)} ${formatPercent(a.share)}`).join(", ")}), so the format works solo or together.`);
  else if (att && ctx.attendance[0]) rationale.push(`The most common answer for how guests attend is "${lower(ATTENDANCE[att].label)}"${pct(ctx.attendance[0], size)}.`);

  // 6. Neighborhood.
  const hood = req.neighborhood ? getNeighborhood(req.neighborhood) : undefined;
  if (hood) {
    const b = ctx.topNeighborhoods.find((n) => n.key === hood.key);
    rationale.push(b ? `${b.guests} guests list ${hood.name} as their neighborhood.` : `Fewer than 5 guests list ${hood.name} as their neighborhood, so this concept uses demand across all of NYC.`);
  }
  if (!hasData) rationale.push("There isn't enough guest preference data yet, so this concept uses Tastable's category defaults.");

  // 7. Price, duration and group size.
  const roundTo5 = (n: number) => Math.round(n / 5) * 5;
  const suggestedPrice = Math.min(req.priceMax, Math.max(req.priceMin, roundTo5(d.basePrice)));
  const groupMax = Math.min(req.capacity, d.groupMax);
  const groupMin = Math.max(2, Math.round(groupMax * 0.6));
  const duration = Math.min(d.duration, Math.max(60, LATEST_END - slot.start * 60));
  const start = slot.start * 60;

  // 8. Title, copy, menu and itinerary.
  // Titles in title case ("Jerk Chicken & Doubles Social Night"); body copy keeps sentence case.
  const tc = (x: string) => x.replace(/(^|[\s-])(\p{Ll})/gu, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
  const pair = `${tc(main)} & ${tc(sweetName)}`;
  const social = socialAtmosphere !== "BRING_YOUR_PEOPLE";
  const titles: Record<ExperienceCategory, string[]> = {
    COOKING_CLASS_WORKSHOP: [social ? `${pair} Social Night` : `${pair} Date Night`, `Hands-On ${cuisineName}: ${pair}`, `${main} Workshop & ${sweetName} Tasting`],
    SUPPER_CLUB_PRIVATE_DINING: [`${cuisineName} Supper Club: ${pair}`, `The ${dayName} ${cuisineName} Table`, `${main} Long-Table Dinner`],
    POPUP_EXCLUSIVE: [`${pair} Pop-Up`, `One Night Only: ${cuisineName} ${main}`, `${main} Counter Pop-Up`],
    SOCIAL_CULINARY: [`${pair} Social`, `${cuisineName} ${dayName} Social`, `${main} Mixer`],
  };
  const options = titles[category];
  const title = tc(options[req.variant % options.length]).slice(0, 90);
  const theme = req.theme ? ` ${req.theme.charAt(0).toUpperCase()}${req.theme.slice(1).replace(/\.$/, "")}.` : "";
  const where = hood ? ` in ${hood.name}` : " in New York";

  const step = (startOffsetMinutes: number, endOffsetMinutes: number | null, title: string, description = "") => ({ startOffsetMinutes, endOffsetMinutes, title, description });
  const q = (f: number) => Math.round((duration * f) / 15) * 15;
  const itinerary =
    category === "COOKING_CLASS_WORKSHOP"
      ? [
          step(0, q(0.125), "Arrival and welcome drinks", "Meet your host and fellow cooks."),
          step(q(0.125), q(0.5), `${main}-making workshop`, `Learn the technique hands-on, from prep to finish.`),
          step(q(0.5), q(0.75), "Dinner", `Sit down together and eat what you made.`),
          step(q(0.75), duration, `${sweetName} tasting`, isSweet ? "A sweet finish to round off the evening." : "One more dish to taste before the night ends."),
          step(duration, null, "End", ""),
        ]
      : category === "SUPPER_CLUB_PRIVATE_DINING"
        ? [
            step(0, q(0.15), "Arrival and welcome drink", "Settle in and meet the table."),
            step(q(0.15), q(0.4), "First courses", `Shared plates to open the meal.`),
            step(q(0.4), q(0.75), `${main} main course`, "The heart of the menu, served family-style."),
            step(q(0.75), duration, `${sweetName} and conversation`, isSweet ? "Dessert, coffee and lingering." : "A final course, then lingering."),
            step(duration, null, "End", ""),
          ]
        : [
            step(0, q(0.2), "Doors open", "Welcome drinks and first bites."),
            step(q(0.2), q(0.6), `${main} service`, `Freshly made ${lower(main)}, served as it's ready.`),
            step(q(0.6), duration, `${sweetName} and mingling`, isSweet ? "Something sweet while the night winds down." : "A second dish while the night winds down."),
            step(duration, null, "End", ""),
          ];

  const item = (key: string) => ({ name: dishName(key, cuisine), description: "", dish: key, dietaryTags: [] as string[] });
  const menuSections =
    category === "COOKING_CLASS_WORKSHOP"
      ? [
          { title: "What you'll cook", description: "Everyone cooks; ingredients and equipment provided.", items: mains.map(item) },
          { title: isSweet ? "To finish" : "Also tasting", description: "", items: [item(dessert)] },
          { title: "To drink", description: "", items: [{ name: "Welcome drink", description: "Non-alcoholic option available.", dietaryTags: [] as string[] }] },
        ]
      : [
          { title: category === "SUPPER_CLUB_PRIVATE_DINING" ? "Mains" : "On the menu", description: "", items: mains.map(item) },
          { title: isSweet ? "Dessert" : "To finish", description: "", items: [item(dessert)] },
        ];

  const noun = CATEGORY_NOUN[category];
  const partOfDay = slot.start < 14 ? "lunchtime" : slot.start < 17 ? "afternoon" : slot.start < 22 ? "evening" : "late-night";
  const summary = `${category === "COOKING_CLASS_WORKSHOP" ? "Make" : "Enjoy"} ${lower(main)} and ${lower(sweetName)} at a ${dayName} ${partOfDay} ${noun}${where}.`.slice(0, 160);
  const article = /^[AEIOU]/.test(cuisineName) ? "An" : "A";
  const description = [
    `${article} ${cuisineName} ${noun} built around two of the dishes Tastable guests ask for most: ${lower(main)} and ${lower(sweetName)}.${theme}`,
    category === "COOKING_CLASS_WORKSHOP"
      ? `You'll learn to make ${lower(main)} from scratch, then sit down to eat together before a ${lower(sweetName)} tasting.`
      : `Expect generous, shared plates of ${lower(main)}, followed by ${lower(sweetName)}.`,
    `${atmosphereNote} About ${Math.round(duration / 60)} hours, for ${groupMin}–${groupMax} guests.`,
  ].join(" ");

  const tags = [...new Set([cuisineName.toLowerCase(), ...featuredKeys.map((k) => dishName(k, cuisine).toLowerCase()), noun, `${dayName.toLowerCase()} ${slot.start >= 18 ? "night" : "afternoon"}`])]
    .map((t) => t.slice(0, 30))
    .slice(0, 8);
  const occasions: EventConcept["occasions"] = [
    ...(category === "COOKING_CLASS_WORKSHOP" ? (["LEARN_SOMETHING_NEW"] as const) : []),
    socialAtmosphere === "BRING_YOUR_PEOPLE" ? "BRING_A_FRIEND" : "MEET_NEW_PEOPLE",
  ];

  return eventConcept.parse({
    source: CONCEPT_SOURCE,
    title,
    summary,
    description,
    category,
    cuisine,
    format: d.format,
    occasions,
    featuredDishes: featuredKeys,
    menuSections,
    itinerary,
    durationMinutes: duration,
    price: { min: req.priceMin, max: req.priceMax, suggested: suggestedPrice },
    groupSize: { min: Math.min(groupMin, groupMax), max: groupMax },
    day,
    timeSlot,
    startTime: hhmm(start),
    socialAtmosphere,
    atmosphereNote,
    tags,
    rationale: rationale.slice(0, 10),
  });
}

/** "6:00 PM" for an itinerary step, given the concept's start time. */
export function conceptClock(startTime: string, offsetMinutes: number) {
  const [h, m] = startTime.split(":").map(Number);
  return clock(h * 60 + m + offsetMinutes);
}
