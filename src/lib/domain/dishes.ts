import type { CuisineKey } from "@/lib/domain/taxonomy";

/**
 * Dish catalog. Guests pick favorites from it during onboarding, hosts tag the dishes an event
 * features, and host insights aggregate both by the same key. Anything not in the catalog is a
 * custom entry, normalized to a stable "custom:<slug>" key so different spellings group together.
 *
 * Keys are permanent: add new dishes freely, but never rename or reuse a key.
 */
export type Dish = { key: string; label: string; cuisine: CuisineKey; aliases?: readonly string[] };

export const DISHES: readonly Dish[] = [
  { key: "omakase", label: "Omakase", cuisine: "japanese" },
  { key: "sushi", label: "Sushi", cuisine: "japanese", aliases: ["nigiri", "maki"] },
  { key: "ramen", label: "Ramen", cuisine: "japanese" },
  { key: "gyoza", label: "Gyoza", cuisine: "japanese", aliases: ["potstickers"] },
  { key: "pasta", label: "Pasta", cuisine: "italian", aliases: ["fresh pasta", "handmade pasta", "spaghetti", "tagliatelle"] },
  { key: "pizza", label: "Pizza", cuisine: "italian", aliases: ["neapolitan pizza"] },
  { key: "risotto", label: "Risotto", cuisine: "italian" },
  { key: "tiramisu", label: "Tiramisu", cuisine: "italian" },
  { key: "croissant", label: "Croissants", cuisine: "french", aliases: ["croissants", "viennoiserie"] },
  { key: "steak-frites", label: "Steak frites", cuisine: "french" },
  { key: "steak", label: "Steak", cuisine: "new-american", aliases: ["steaks", "ribeye"] },
  { key: "souffle", label: "Soufflé", cuisine: "french", aliases: ["souffle"] },
  { key: "korean-bbq", label: "Korean barbecue", cuisine: "korean", aliases: ["kbbq", "korean bbq"] },
  { key: "kimchi", label: "Kimchi", cuisine: "korean" },
  { key: "bibimbap", label: "Bibimbap", cuisine: "korean" },
  { key: "tacos", label: "Tacos", cuisine: "mexican", aliases: ["taco"] },
  { key: "mole", label: "Mole", cuisine: "mexican" },
  { key: "tamales", label: "Tamales", cuisine: "mexican", aliases: ["tamale"] },
  { key: "jollof-rice", label: "Jollof rice", cuisine: "west-african", aliases: ["jollof"] },
  { key: "suya", label: "Suya", cuisine: "west-african" },
  { key: "egusi", label: "Egusi soup", cuisine: "west-african", aliases: ["egusi"] },
  { key: "mezze", label: "Mezze", cuisine: "middle-eastern", aliases: ["meze"] },
  { key: "hummus", label: "Hummus", cuisine: "middle-eastern" },
  { key: "shawarma", label: "Shawarma", cuisine: "middle-eastern" },
  { key: "jerk-chicken", label: "Jerk chicken", cuisine: "caribbean", aliases: ["jerk"] },
  { key: "doubles", label: "Doubles", cuisine: "caribbean" },
  { key: "oxtail", label: "Oxtail stew", cuisine: "caribbean", aliases: ["oxtail"] },
  { key: "biryani", label: "Biryani", cuisine: "indian" },
  { key: "dosa", label: "Dosa", cuisine: "indian" },
  { key: "curry", label: "Curry", cuisine: "indian" },
  { key: "chaat", label: "Chaat", cuisine: "indian" },
  { key: "burger", label: "Burger", cuisine: "new-american", aliases: ["burgers", "smash burger"] },
  { key: "fried-chicken", label: "Fried chicken", cuisine: "new-american" },
  { key: "oysters", label: "Oysters", cuisine: "new-american", aliases: ["raw bar"] },
  { key: "brunch-plates", label: "Brunch plates", cuisine: "new-american", aliases: ["brunch", "eggs benedict"] },
  { key: "grain-bowl", label: "Grain bowls", cuisine: "plant-based", aliases: ["grain bowls", "buddha bowl"] },
  { key: "plant-based-tasting", label: "Plant-based tasting menu", cuisine: "plant-based" },
  { key: "dumplings", label: "Dumplings", cuisine: "global", aliases: ["soup dumplings", "xiao long bao", "momos"] },
  { key: "tasting-menu", label: "Tasting menu", cuisine: "global" },
  { key: "cheese-board", label: "Cheese and charcuterie", cuisine: "global", aliases: ["charcuterie", "cheese board"] },
  { key: "pastries", label: "Pastries", cuisine: "global", aliases: ["pastry", "patisserie"] },
  { key: "ice-cream", label: "Ice cream", cuisine: "global", aliases: ["icecream", "gelato", "ice creams"] },
  { key: "dessert", label: "Desserts", cuisine: "global", aliases: ["desserts", "sweets"] },
] as const;

export const DISH_KEYS = DISHES.map((d) => d.key) as [string, ...string[]];
export const CUSTOM_PREFIX = "custom:";
export const MAX_FAVORITE_DISHES = 10;
export const MAX_CUSTOM_DISH_LENGTH = 60;

/** Lowercase, accent-free, single-spaced text used for matching. */
export function normalizeDishText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const BY_TEXT = new Map<string, string>();
for (const d of DISHES) {
  for (const t of [d.key.replace(/-/g, " "), d.label, ...(d.aliases ?? [])]) BY_TEXT.set(normalizeDishText(t), d.key);
}

export function getDish(key: string) {
  return DISHES.find((d) => d.key === key);
}

export function isCustomDishKey(key: string) {
  return key.startsWith(CUSTOM_PREFIX);
}

export type NormalizedDish = { dishKey: string; isCustom: boolean; customName: string | null };

/**
 * Turns a selection into a stored dish. Catalog keys pass through; free text that matches a
 * catalog label or alias ("Soup dumplings") becomes that catalog key; anything else becomes a
 * custom key ("custom:grandmas-pierogi") keeping the guest's wording in customName.
 * Returns null for blank input.
 */
export function normalizeDish(input: { key?: string | null; custom?: string | null }): NormalizedDish | null {
  if (input.key && getDish(input.key)) return { dishKey: input.key, isCustom: false, customName: null };
  const fromKey = input.key && isCustomDishKey(input.key) ? input.key.slice(CUSTOM_PREFIX.length).replace(/-/g, " ") : input.key;
  const raw = (input.custom || fromKey || "").replace(/\s+/g, " ").trim().slice(0, MAX_CUSTOM_DISH_LENGTH);
  const text = normalizeDishText(raw);
  if (!text) return null;
  const known = BY_TEXT.get(text);
  if (known) return { dishKey: known, isCustom: false, customName: null };
  return { dishKey: `${CUSTOM_PREFIX}${text.replace(/ /g, "-")}`, isCustom: true, customName: raw };
}

/** Normalizes and de-duplicates a list, keeping the first occurrence's order. */
export function normalizeDishList(inputs: { key?: string | null; custom?: string | null }[]) {
  const out: NormalizedDish[] = [];
  const seen = new Set<string>();
  for (const i of inputs) {
    const d = normalizeDish(i);
    if (!d || seen.has(d.dishKey)) continue;
    seen.add(d.dishKey);
    out.push(d);
  }
  return out;
}

export function dishLabel(key: string, customName?: string | null) {
  if (customName) return customName;
  const dish = getDish(key);
  if (dish) return dish.label;
  if (isCustomDishKey(key)) {
    const words = key.slice(CUSTOM_PREFIX.length).replace(/-/g, " ");
    return words.charAt(0).toUpperCase() + words.slice(1);
  }
  return key;
}
