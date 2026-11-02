import "server-only";

import type { PrefsValue } from "@/components/onboarding/preference-steps";
import { parseList } from "@/lib/domain/lists";

export function toPrefsValue(p: { locationKey: string; travelRadiusMiles: number | null; favoriteCuisines: string; favoriteCategories: string; motivations: string; maxBudgetCents?: number | null } | null | undefined): PrefsValue {
  return {
    locationKey: p?.locationKey ?? "nyc",
    travelRadiusMiles: p?.travelRadiusMiles ?? null,
    cuisines: parseList(p?.favoriteCuisines),
    categories: parseList(p?.favoriteCategories),
    motivations: parseList(p?.motivations),
    maxBudgetDollars: p?.maxBudgetCents ? p.maxBudgetCents / 100 : null,
  };
}
