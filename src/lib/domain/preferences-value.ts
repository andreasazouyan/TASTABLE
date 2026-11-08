/** The editable shape of a guest's preferences, shared by onboarding and the profile editor. */
export type DishChoice = { key: string; label: string; isCustom: boolean };
export type GuestPrefsValue = {
  locationKey: string | null;
  maxTravelMinutes: 20 | 30 | 45 | null;
  preferredDays: string[];
  preferredTimes: string[];
  attendancePreference: "SOLO" | "FRIENDS_OR_PARTNER" | "DEPENDS" | null;
  categories: string[];
  cuisines: string[];
  favoriteDishes: DishChoice[];
};
/** Server read model → editable value. "nyc" (no neighborhood chosen) shows as nothing selected. */
export function toPrefsValue(p: {
  locationKey: string;
  maxTravelMinutes: number | null;
  preferredDays: string[];
  preferredTimes: string[];
  attendancePreference: GuestPrefsValue["attendancePreference"];
  categories: string[];
  cuisines: string[];
  favoriteDishes: DishChoice[];
}): GuestPrefsValue {
  return {
    locationKey: p.locationKey === "nyc" ? null : p.locationKey,
    maxTravelMinutes: p.maxTravelMinutes as GuestPrefsValue["maxTravelMinutes"],
    preferredDays: p.preferredDays,
    preferredTimes: p.preferredTimes,
    attendancePreference: p.attendancePreference,
    categories: p.categories,
    cuisines: p.cuisines,
    favoriteDishes: p.favoriteDishes,
  };
}

