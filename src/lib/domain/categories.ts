import { ChefHat, PartyPopper, Sparkles, UtensilsCrossed, type LucideIcon } from "lucide-react";
import type { ExperienceCategory } from "@/generated/prisma/enums";

export type CategoryMeta = {
  id: ExperienceCategory;
  /** URL-friendly identifier used in routes and query strings. */
  slug: string;
  name: string;
  shortName: string;
  description: string;
  icon: LucideIcon;
  photo: string;
};

/**
 * The four Tastable experience categories, in display order. Single source of truth.
 * Host type (chef, creator...) is NOT a category: see HOST_TYPES.
 */
export const CATEGORIES: readonly CategoryMeta[] = [
  {
    id: "SUPPER_CLUB_PRIVATE_DINING",
    slug: "supper-clubs",
    name: "Supper Clubs & Private Dining",
    shortName: "Supper Clubs",
    description: "Intimate dinners in lofts, homes and hidden rooms, around one long table.",
    icon: UtensilsCrossed,
    photo: "heroTable",
  },
  {
    id: "COOKING_CLASS_WORKSHOP",
    slug: "classes",
    name: "Cooking Classes & Workshops",
    shortName: "Classes",
    description: "Hands-on sessions where you leave with a new skill, and dinner.",
    icon: ChefHat,
    photo: "kitchenClass",
  },
  {
    id: "POPUP_EXCLUSIVE",
    slug: "pop-ups",
    name: "Pop-Ups & Exclusive Experiences",
    shortName: "Pop-Ups",
    description: "Limited runs, unexpected venues and one-night-only menus.",
    icon: Sparkles,
    photo: "platedDish",
  },
  {
    id: "SOCIAL_CULINARY",
    slug: "social",
    name: "Social Culinary Experiences",
    shortName: "Social",
    description: "Tastings, food walks and dinners made for meeting new people.",
    icon: PartyPopper,
    photo: "toast",
  },
] as const;

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [ExperienceCategory, ...ExperienceCategory[]];

export function getCategory(id: ExperienceCategory): CategoryMeta {
  const found = CATEGORIES.find((c) => c.id === id);
  if (!found) throw new Error(`Unknown category: ${id}`);
  return found;
}

export function getCategoryBySlug(slug: string | undefined | null): CategoryMeta | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}
