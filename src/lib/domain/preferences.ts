import type { AttendancePreference, SocialAtmosphere } from "@/generated/prisma/enums";
import { nyWeekdayHour } from "@/lib/clock";

/**
 * Guest preference vocabulary shared by onboarding, discovery and host insights.
 * Stored values are the keys below; labels are for display only.
 */

/** Weekday keys, indexed like Date#getDay (0 = Sunday). */
export const DAYS = [
  { key: "SUN", label: "Sunday", short: "Sun" },
  { key: "MON", label: "Monday", short: "Mon" },
  { key: "TUE", label: "Tuesday", short: "Tue" },
  { key: "WED", label: "Wednesday", short: "Wed" },
  { key: "THU", label: "Thursday", short: "Thu" },
  { key: "FRI", label: "Friday", short: "Fri" },
  { key: "SAT", label: "Saturday", short: "Sat" },
] as const;
export type DayKey = (typeof DAYS)[number]["key"];
export const DAY_KEYS = DAYS.map((d) => d.key) as [DayKey, ...DayKey[]];

/**
 * Preferred two-hour time slots, as canonical 24-hour ranges [startHour, endHour) in New York
 * time. The last slot ends at 24 (midnight). Keys are stable stored values.
 */
export const TIME_SLOT_PREFS = [
  { key: "12-14", start: 12, end: 14, label: "12:00–2:00 PM", hint: "Lunch & midday bites" },
  { key: "14-16", start: 14, end: 16, label: "2:00–4:00 PM", hint: "Afternoon experiences" },
  { key: "16-18", start: 16, end: 18, label: "4:00–6:00 PM", hint: "Early evening" },
  { key: "18-20", start: 18, end: 20, label: "6:00–8:00 PM", hint: "Dinner time" },
  { key: "20-22", start: 20, end: 22, label: "8:00–10:00 PM", hint: "Evening experiences" },
  { key: "22-24", start: 22, end: 24, label: "10:00 PM–12:00 AM", hint: "Late-night gatherings" },
] as const;
export type TimeSlotKey = (typeof TIME_SLOT_PREFS)[number]["key"];
export const TIME_SLOT_KEYS = TIME_SLOT_PREFS.map((s) => s.key) as [TimeSlotKey, ...TimeSlotKey[]];

/**
 * Minutes since New York midnight for the start of a session, and its end on the same scale.
 * A session that runs past midnight gets an end above 1440 instead of wrapping to 0.
 */
export function sessionMinuteRange(startsAt: Date, endsAt: Date) {
  const { hour } = nyWeekdayHour(startsAt);
  const minute = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", minute: "numeric" }).format(startsAt));
  const start = hour * 60 + minute;
  const duration = Math.max(0, Math.round((endsAt.getTime() - startsAt.getTime()) / 60_000));
  return { start, end: start + duration };
}

/** Slot keys whose range overlaps the session (half-open ranges: touching edges don't count). */
export function overlappingSlots(startsAt: Date, endsAt: Date): TimeSlotKey[] {
  const { start, end } = sessionMinuteRange(startsAt, endsAt);
  return TIME_SLOT_PREFS.filter((s) => start < s.end * 60 && end > s.start * 60).map((s) => s.key);
}

/** Does a session overlap any of the guest's preferred slots? Empty preference = no opinion (true). */
export function sessionMatchesSlots(preferred: readonly string[], startsAt: Date, endsAt: Date) {
  if (!preferred.length) return true;
  return overlappingSlots(startsAt, endsAt).some((k) => preferred.includes(k));
}

/** Weekday key of a session start in New York. */
export function sessionDay(startsAt: Date): DayKey {
  return DAYS[nyWeekdayHour(startsAt).weekday].key;
}

/**
 * Maximum travel time, stored exactly as answered. It is deliberately NOT converted to or from
 * straight-line distance: without a routing provider any such conversion would be invented.
 */
export const TRAVEL_TIMES = [
  { minutes: 20, label: "20 minutes" },
  { minutes: 30, label: "30 minutes" },
  { minutes: 45, label: "45 minutes" },
] as const;
export type TravelMinutes = (typeof TRAVEL_TIMES)[number]["minutes"];
export const TRAVEL_MINUTES = TRAVEL_TIMES.map((t) => t.minutes) as [TravelMinutes, ...TravelMinutes[]];

/** Onboarding asks for one to three experience categories. */
export const MAX_PREFERRED_CATEGORIES = 3;

export const ATTENDANCE: Record<AttendancePreference, { label: string; hint: string }> = {
  SOLO: { label: "On my own", hint: "I'm here for the experience!" },
  FRIENDS_OR_PARTNER: { label: "With a friend or partner", hint: "Great experiences are better shared." },
  DEPENDS: { label: "A bit of both", hint: "It depends on the experience!" },
};
export const ATTENDANCE_IDS = Object.keys(ATTENDANCE) as [AttendancePreference, ...AttendancePreference[]];

/** Does an event's social format suit how the guest likes to attend? */
export function attendanceFits(pref: AttendancePreference | null | undefined, atmosphere: SocialAtmosphere | string) {
  if (!pref || pref === "DEPENDS" || atmosphere === "EITHER_WAY") return true;
  return pref === "SOLO" ? atmosphere === "MEET_NEW_PEOPLE" : atmosphere === "BRING_YOUR_PEOPLE";
}

export type OnboardingStatus = "NOT_STARTED" | "IN_PROGRESS" | "SKIPPED" | "COMPLETED";

type StatusInput = {
  onboardingCompletedAt: Date | null;
  onboardingSkippedAt: Date | null;
  locationKey?: string;
  favoriteCuisines?: string;
  favoriteCategories?: string;
  motivations?: string;
  preferredDays?: string;
  preferredTimes?: string;
  attendancePreference?: string | null;
  maxBudgetCents?: number | null;
  maxTravelMinutes?: number | null;
};

/**
 * Derived from the stored timestamps and answers, so there is no status column to drift.
 * IN_PROGRESS means some answers are saved (onboarding saves after each step) but not finished.
 */
export function onboardingStatus(p: StatusInput | null | undefined): OnboardingStatus {
  if (!p) return "NOT_STARTED";
  if (p.onboardingCompletedAt) return "COMPLETED";
  if (p.onboardingSkippedAt) return "SKIPPED";
  const answered =
    (p.locationKey && p.locationKey !== "nyc") ||
    p.favoriteCuisines ||
    p.favoriteCategories ||
    p.motivations ||
    p.preferredDays ||
    p.preferredTimes ||
    p.attendancePreference ||
    p.maxBudgetCents != null ||
    p.maxTravelMinutes != null;
  return answered ? "IN_PROGRESS" : "NOT_STARTED";
}

/**
 * Cuisine options shown in onboarding and profile editing, in display order. Keys are the shared
 * cuisine keys; OPEN_TO_EVERYTHING is a preference-only value (no event has it) meaning
 * "any cuisine". Selecting it clears the others and vice versa.
 */
export const OPEN_TO_EVERYTHING = "any";
export const PREFERENCE_CUISINES = [
  { key: "italian", label: "Italian" },
  { key: "japanese", label: "Japanese" },
  { key: "indian", label: "Indian" },
  { key: "french", label: "French" },
  { key: "korean", label: "Korean" },
  { key: "chinese", label: "Chinese" },
  { key: "mexican", label: "Mexican" },
  { key: "thai", label: "Thai" },
  { key: "middle-eastern", label: "Middle Eastern" },
  { key: "mediterranean", label: "Mediterranean" },
  { key: "new-american", label: "American" },
  { key: "vietnamese", label: "Vietnamese" },
  { key: "caribbean", label: "Caribbean" },
  { key: "west-african", label: "West African" },
  { key: "plant-based", label: "Plant-based" },
  { key: OPEN_TO_EVERYTHING, label: "Open to everything" },
] as const;
export const PREFERENCE_CUISINE_KEYS = PREFERENCE_CUISINES.map((c) => c.key) as [string, ...string[]];

export function preferenceCuisineLabel(key: string) {
  return PREFERENCE_CUISINES.find((c) => c.key === key)?.label;
}

/** Applies the "Open to everything" exclusivity rule to a toggled selection. */
export function toggleCuisine(current: readonly string[], key: string, on: boolean): string[] {
  if (!on) return current.filter((k) => k !== key);
  if (key === OPEN_TO_EVERYTHING) return [OPEN_TO_EVERYTHING];
  return [...current.filter((k) => k !== OPEN_TO_EVERYTHING && k !== key), key];
}

/** Dish suggestions shown first in onboarding (the rest of the catalog is searchable). */
export const SUGGESTED_DISHES = ["pizza", "pasta", "sushi", "ramen", "dumplings", "tacos", "curry", "steak", "ice-cream", "pastries", "tiramisu", "dim-sum", "pho", "pad-thai", "korean-bbq", "croissant"] as const;
