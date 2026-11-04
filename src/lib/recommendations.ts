import { dishLabel } from "@/lib/domain/dishes";
import { distanceMiles, getNeighborhood, getNeighborhoodByName } from "@/lib/domain/neighborhoods";
import { attendanceFits, DAYS, sessionDay, TIME_SLOT_PREFS, overlappingSlots } from "@/lib/domain/preferences";
import { cuisineLabel } from "@/lib/domain/taxonomy";

/**
 * Deterministic, explainable recommendations. Each matching rule adds points and a short
 * human-readable reason. No hidden model: the same preferences and catalog always produce
 * the same ranking (ties break by next session date, then slug).
 *
 * Preferences rank; they don't hide. Only the guest's explicit limits (budget, and the legacy
 * mile radius some older profiles still have) exclude anything, and the list keeps variety: no
 * more than two picks from one category or host, and open slots are filled with popular
 * experiences the guest might not have thought of. Travel time is used as a soft signal through
 * neighborhoods only; no journey time is calculated or claimed.
 */
export type RecPreferences = {
  locationKey: string;
  travelRadiusMiles: number | null;
  cuisines: string[];
  categories: string[];
  motivations: string[];
  /** Max ticket price per person in cents. Null = no limit. */
  maxBudgetCents?: number | null;
  /** Host slugs the guest follows. */
  followedHosts?: string[];
  /** Favorite dish keys (catalog or custom:...). */
  dishes?: string[];
  days?: string[];
  timeSlots?: string[];
  attendance?: "SOLO" | "FRIENDS_OR_PARTNER" | "DEPENDS" | null;
  maxTravelMinutes?: number | null;
};

export type RecSession = { id: string; startsAt: Date; endsAt: Date };

export type RecCandidate = {
  id: string;
  slug: string;
  category: string;
  cuisine: string;
  format: string;
  socialAtmosphere: string;
  occasions: string[];
  hostType: string;
  isSecretLocation: boolean;
  venueLat: number;
  venueLng: number;
  nextStartsAt: Date | null;
  /** Ticket price of the next bookable session, in cents. */
  priceCents?: number;
  hostSlug?: string;
  hostName?: string;
  /** Featured dish keys. */
  dishes?: string[];
  /** Bookable upcoming sessions, soonest first. */
  sessions?: RecSession[];
  venueNeighborhood?: string;
  /** Unique savers, used to pick popular "discover" fillers. */
  saveCount?: number;
};

export type Recommendation<T extends RecCandidate> = {
  item: T;
  score: number;
  reasons: string[];
  distance: number | null;
  /** The session that best fits the guest's days and time slots (or the next one). */
  session: RecSession | null;
  /** True for variety fillers that matched no preference. */
  discovery?: boolean;
};

type Ctx = { session: RecSession | null };
type Rule = { when: (p: RecPreferences, c: RecCandidate, ctx: Ctx) => boolean; points: number; reason: (c: RecCandidate, p: RecPreferences, ctx: Ctx) => string };

const usd = (cents: number) => `$${Math.round(cents / 100)}`;
const lovesCuisine = (p: RecPreferences, c: RecCandidate) => p.cuisines.includes(c.cuisine);
const favoriteDish = (p: RecPreferences, c: RecCandidate) => (c.dishes ?? []).find((d) => (p.dishes ?? []).includes(d));

function slotFits(p: RecPreferences, s: RecSession) {
  const dayOk = !p.days?.length || p.days.includes(sessionDay(s.startsAt));
  const timeOk = !p.timeSlots?.length || overlappingSlots(s.startsAt, s.endsAt).some((k) => p.timeSlots!.includes(k));
  return dayOk && timeOk;
}

const RULES: Rule[] = [
  {
    // Following a host is the strongest signal a guest can give, so it outweighs every other rule combined.
    when: (p, c) => !!c.hostSlug && (p.followedHosts ?? []).includes(c.hostSlug),
    points: 20,
    reason: (c) => `Hosted by ${c.hostName ?? "a host"}, whom you follow`,
  },
  {
    when: (p, c) => !!favoriteDish(p, c),
    points: 3,
    reason: (c, p) => `Featuring one of your favorite dishes: ${dishLabel(favoriteDish(p, c)!)}`,
  },
  {
    when: (p, c) => lovesCuisine(p, c),
    points: 2,
    reason: (c) => `Matches your love for ${cuisineLabel(c.cuisine)} cuisine`,
  },
  {
    when: (p, c) => p.categories.includes(c.category),
    points: 2,
    reason: () => "In a category you chose",
  },
  {
    when: (p, _c, ctx) => !!ctx.session && (!!p.days?.length || !!p.timeSlots?.length) && slotFits(p, ctx.session),
    points: 2,
    reason: (_c, p, ctx) => {
      const day = DAYS.find((d) => d.key === sessionDay(ctx.session!.startsAt))!.label;
      const slot = TIME_SLOT_PREFS.find((s) => overlappingSlots(ctx.session!.startsAt, ctx.session!.endsAt).includes(s.key) && (!p.timeSlots?.length || p.timeSlots.includes(s.key)));
      return slot ? `${day}, ${slot.label}: when you like to go out` : `On a ${day}, when you like to go out`;
    },
  },
  {
    when: (p, c) => p.attendance === "FRIENDS_OR_PARTNER" && (c.socialAtmosphere === "BRING_YOUR_PEOPLE" || c.occasions.includes("BRING_A_FRIEND")),
    points: 2,
    reason: () => "Perfect for a night out with friends",
  },
  {
    when: (p, c) => p.attendance === "SOLO" && c.socialAtmosphere === "MEET_NEW_PEOPLE",
    points: 2,
    reason: () => "Great on your own: shared tables make it easy to meet people",
  },
  {
    when: (p, c) => p.motivations.includes("LEARN") && (c.category === "COOKING_CLASS_WORKSHOP" || c.format === "HANDS_ON_CLASS"),
    points: 3,
    reason: () => "Hands-on, and you want to learn new skills",
  },
  {
    when: (p, c) => p.motivations.includes("MEET_PEOPLE") && (c.category === "SOCIAL_CULINARY" || c.socialAtmosphere === "MEET_NEW_PEOPLE"),
    points: 3,
    reason: () => "Communal format for meeting new people",
  },
  {
    when: (p, c) => p.motivations.includes("DATE_NIGHT") && c.occasions.includes("DATE_NIGHT"),
    points: 3,
    reason: () => "A date-night pick",
  },
  {
    when: (p, c) => p.motivations.includes("FRIENDS") && p.attendance !== "FRIENDS_OR_PARTNER" && (c.occasions.includes("BRING_A_FRIEND") || c.socialAtmosphere === "BRING_YOUR_PEOPLE"),
    points: 2,
    reason: () => "Great to book with friends",
  },
  {
    when: (p, c) => p.motivations.includes("UNIQUE") && (c.category === "POPUP_EXCLUSIVE" || c.isSecretLocation),
    points: 2,
    reason: (c) => (c.isSecretLocation ? "Secret location, for something unique" : "A limited pop-up, for something unique"),
  },
  {
    when: (p, c) =>
      p.motivations.includes("MEET_CHEF") &&
      (c.format === "CHEFS_TABLE" || ["PRIVATE_CHEF", "CREATOR_INFLUENCER", "CULINARY_PROFESSIONAL"].includes(c.hostType)),
    points: 2,
    reason: (c) => (c.format === "CHEFS_TABLE" ? "Chef's table: meet the chef" : "Hosted by a chef or creator"),
  },
  {
    when: (p, c) => p.motivations.includes("SPECIAL_OCCASION") && c.occasions.includes("SPECIAL_OCCASION"),
    points: 2,
    reason: () => "Suited to a special occasion",
  },
];

/** Picks the soonest session that fits the guest's days and slots, else the soonest one. */
function bestSession(p: RecPreferences, c: RecCandidate): RecSession | null {
  const sessions = c.sessions ?? [];
  return sessions.find((s) => slotFits(p, s)) ?? sessions[0] ?? null;
}

/** Score one candidate. `hardFilters` applies the guest's explicit limits (budget, legacy radius). */
export function scoreCandidate<T extends RecCandidate>(prefs: RecPreferences, c: T, hardFilters = true): Recommendation<T> | null {
  const origin = getNeighborhood(prefs.locationKey);
  const distance = origin ? distanceMiles(origin, { lat: c.venueLat, lng: c.venueLng }) : null;
  const followed = !!c.hostSlug && (prefs.followedHosts ?? []).includes(c.hostSlug);
  const budget = prefs.maxBudgetCents ?? null;
  if (hardFilters) {
    // Legacy radius (older profiles) and budget are explicit limits, except for followed hosts.
    if (origin && prefs.travelRadiusMiles !== null && distance !== null && distance > prefs.travelRadiusMiles && !followed) return null;
    if (budget !== null && c.priceCents !== undefined && c.priceCents > budget && !followed) return null;
  }
  const ctx: Ctx = { session: bestSession(prefs, c) };

  let score = 0;
  const reasons: string[] = [];
  for (const rule of RULES) {
    if (rule.when(prefs, c, ctx)) {
      score += rule.points;
      reasons.push(rule.reason(c, prefs, ctx));
    }
  }
  if (prefs.attendance && !attendanceFits(prefs.attendance, c.socialAtmosphere)) score -= 1;
  if (budget !== null && c.priceCents !== undefined && c.priceCents <= budget && score > 0) {
    score += 1;
    reasons.push(`${usd(c.priceCents)}, within your ${usd(budget)} budget`);
  }
  // Neighborhood proximity: a soft signal, stronger for guests who prefer shorter trips.
  if (origin) {
    const venueHood = c.venueNeighborhood ? getNeighborhoodByName(c.venueNeighborhood) : undefined;
    const shortTrips = prefs.maxTravelMinutes != null && prefs.maxTravelMinutes <= 20;
    if (venueHood?.key === origin.key) {
      score += 2;
      reasons.push(`In ${origin.name}, your neighborhood`);
    } else if (distance !== null && distance <= (shortTrips ? 1.5 : 2.5)) {
      score += 1;
      reasons.push(`Close to ${origin.name}`);
    } else if (shortTrips && distance !== null && distance > 5) {
      score -= 1;
    }
  }
  return { item: c, score, reasons, distance, session: ctx.session };
}

const byRank = <T extends RecCandidate>(a: Recommendation<T>, b: Recommendation<T>) =>
  b.score - a.score ||
  (a.session?.startsAt.getTime() ?? a.item.nextStartsAt?.getTime() ?? Infinity) - (b.session?.startsAt.getTime() ?? b.item.nextStartsAt?.getTime() ?? Infinity) ||
  a.item.slug.localeCompare(b.item.slug);

/** Personal ranking for discovery results: every candidate stays, ordered by fit. */
export function rankForGuest<T extends RecCandidate>(prefs: RecPreferences, candidates: T[]) {
  return candidates.map((c) => scoreCandidate(prefs, c, false)!).sort(byRank);
}

export function recommend<T extends RecCandidate>(prefs: RecPreferences, candidates: T[], limit = 6): Recommendation<T>[] {
  const scored = candidates.map((c) => scoreCandidate(prefs, c)).filter((r): r is Recommendation<T> => r !== null);
  const matches = scored.filter((r) => r.score > 0 && r.reasons.length > 0).sort(byRank);

  // Variety: at most two per category and per host in the list (followed hosts exempt).
  const picked: Recommendation<T>[] = [];
  const perCategory = new Map<string, number>();
  const perHost = new Map<string, number>();
  const take = (r: Recommendation<T>) => {
    picked.push(r);
    perCategory.set(r.item.category, (perCategory.get(r.item.category) ?? 0) + 1);
    if (r.item.hostSlug) perHost.set(r.item.hostSlug, (perHost.get(r.item.hostSlug) ?? 0) + 1);
  };
  const followed = (r: Recommendation<T>) => !!r.item.hostSlug && (prefs.followedHosts ?? []).includes(r.item.hostSlug);
  for (const r of matches) {
    if (picked.length >= limit) break;
    if (!followed(r) && ((perCategory.get(r.item.category) ?? 0) >= 2 || (r.item.hostSlug && (perHost.get(r.item.hostSlug) ?? 0) >= 2))) continue;
    take(r);
  }
  for (const r of matches) if (picked.length < limit && !picked.includes(r)) take(r);

  // Discovery: fill open slots with popular experiences outside the guest's usual picks.
  if (picked.length < limit) {
    const fillers = scored
      .filter((r) => !picked.includes(r))
      .sort((a, b) => (b.item.saveCount ?? 0) - (a.item.saveCount ?? 0) || byRank(a, b));
    const ordered = [...fillers.filter((r) => (perCategory.get(r.item.category) ?? 0) < 2), ...fillers.filter((r) => (perCategory.get(r.item.category) ?? 0) >= 2)];
    for (const r of ordered) {
      if (picked.length >= limit) break;
      const budget = prefs.maxBudgetCents ?? null;
      const reasons = [r.item.saveCount ? `Something different: saved by ${r.item.saveCount} guests` : "Something different to discover"];
      if (budget !== null && r.item.priceCents !== undefined && r.item.priceCents <= budget) reasons.push(`${usd(r.item.priceCents)}, within your ${usd(budget)} budget`);
      take({ ...r, discovery: true, reasons });
    }
  }
  return picked;
}
