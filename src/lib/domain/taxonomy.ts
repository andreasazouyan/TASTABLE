import type { EventFormat, HostType, SocialAtmosphere } from "@/generated/prisma/enums";

/** Cuisine keys used across experiences, preferences and trends. */
export const CUISINES = [
  { key: "japanese", label: "Japanese" },
  { key: "italian", label: "Italian" },
  { key: "french", label: "French" },
  { key: "korean", label: "Korean" },
  { key: "chinese", label: "Chinese" },
  { key: "thai", label: "Thai" },
  { key: "vietnamese", label: "Vietnamese" },
  { key: "mediterranean", label: "Mediterranean" },
  { key: "mexican", label: "Mexican" },
  { key: "west-african", label: "West African" },
  { key: "middle-eastern", label: "Middle Eastern" },
  { key: "caribbean", label: "Caribbean" },
  { key: "indian", label: "Indian" },
  { key: "new-american", label: "New American" },
  { key: "plant-based", label: "Plant-based" },
  { key: "global", label: "Global" },
] as const;
export type CuisineKey = (typeof CUISINES)[number]["key"];
export const CUISINE_KEYS = CUISINES.map((c) => c.key) as [CuisineKey, ...CuisineKey[]];
export function cuisineLabel(key: string) {
  return CUISINES.find((c) => c.key === key)?.label ?? key;
}

export const HOST_TYPES: Record<HostType, { label: string; description: string }> = {
  PRIVATE_CHEF: { label: "Private chef", description: "Cooks for private tables, homes and events." },
  CREATOR_INFLUENCER: { label: "Food creator", description: "Builds an audience through food content." },
  CULINARY_PROFESSIONAL: { label: "Culinary professional", description: "Restaurant chef, baker, sommelier or instructor." },
  SUPPER_CLUB_ORGANIZER: { label: "Supper club organizer", description: "Runs recurring dinners and gatherings." },
  OTHER: { label: "Culinary host", description: "Enthusiasts, collectives and other hosts." },
};
export const HOST_TYPE_IDS = Object.keys(HOST_TYPES) as [HostType, ...HostType[]];

export const ATMOSPHERES: Record<SocialAtmosphere, { label: string; hint: string }> = {
  MEET_NEW_PEOPLE: { label: "Meet new people", hint: "Shared tables, great solo" },
  BRING_YOUR_PEOPLE: { label: "Bring your people", hint: "Best with friends or a partner" },
  EITHER_WAY: { label: "Solo or together", hint: "Works either way" },
};

export const FORMATS: Record<EventFormat, string> = {
  SEATED_DINNER: "Seated dinner",
  CHEFS_TABLE: "Chef's table",
  HANDS_ON_CLASS: "Hands-on class",
  DEMONSTRATION: "Demonstration",
  TASTING: "Tasting",
  STANDING_RECEPTION: "Standing reception",
  WALKING_TOUR: "Walking tour",
  BRUNCH: "Brunch",
};
export const FORMAT_IDS = Object.keys(FORMATS) as [EventFormat, ...EventFormat[]];

/** Social occasions guests filter by. Stored comma-separated on Experience.occasions. */
export const OCCASIONS = [
  { key: "DATE_NIGHT", label: "Date Night" },
  { key: "BRING_A_FRIEND", label: "Bring a Friend" },
  { key: "MEET_NEW_PEOPLE", label: "Meet New People" },
  { key: "LEARN_SOMETHING_NEW", label: "Learn Something New" },
  { key: "SPECIAL_OCCASION", label: "Special Occasion" },
] as const;
export type OccasionKey = (typeof OCCASIONS)[number]["key"];
export const OCCASION_KEYS = OCCASIONS.map((o) => o.key) as [OccasionKey, ...OccasionKey[]];
export function occasionLabel(key: string) {
  return OCCASIONS.find((o) => o.key === key)?.label ?? key;
}

/** Onboarding motivations. Each maps to transparent recommendation rules. */
export const MOTIVATIONS = [
  { key: "UNIQUE", label: "Discover Something Unique", hint: "One-offs, secret venues, pop-ups" },
  { key: "FRIENDS", label: "Go With Friends", hint: "Tables for your group" },
  { key: "DATE_NIGHT", label: "Date Night", hint: "Intimate settings for two" },
  { key: "MEET_PEOPLE", label: "Meet New People", hint: "Communal tables and socials" },
  { key: "LEARN", label: "Learn New Skills", hint: "Hands-on classes and workshops" },
  { key: "MEET_CHEF", label: "Meet a Chef or Creator", hint: "Chef's tables and creator dinners" },
  { key: "SPECIAL_OCCASION", label: "Special Occasion", hint: "Birthdays, anniversaries, celebrations" },
] as const;
export type MotivationKey = (typeof MOTIVATIONS)[number]["key"];
export const MOTIVATION_KEYS = MOTIVATIONS.map((m) => m.key) as [MotivationKey, ...MotivationKey[]];

/**
 * Per-person spend preference. Tastable's audience is New Yorkers aged roughly 20–35, from
 * students on a budget to professionals happy to pay for a one-off with a favourite creator.
 */
export const BUDGETS = [
  { value: 60, label: "Under $60", hint: "Great finds that won't stretch a student budget" },
  { value: 100, label: "Up to $100", hint: "Classes and dinners at a comfortable price" },
  { value: 150, label: "Up to $150", hint: "Room for a chef's table now and then" },
  { value: null, label: "Treat myself", hint: "No price limit for the right experience" },
] as const;

export const DIETARY_OPTIONS = [
  { key: "vegetarian", label: "Vegetarian" },
  { key: "vegan", label: "Vegan" },
  { key: "pescatarian", label: "Pescatarian" },
  { key: "gluten-free", label: "Gluten-free" },
  { key: "dairy-free", label: "Dairy-free" },
  { key: "nut-free", label: "Nut-free" },
  { key: "halal", label: "Halal" },
  { key: "kosher-style", label: "Kosher-style" },
] as const;
export function dietaryLabel(key: string) {
  return DIETARY_OPTIONS.find((d) => d.key === key)?.label ?? key;
}
