import { distanceMiles, getNeighborhood } from "@/lib/domain/neighborhoods";
import { cuisineLabel } from "@/lib/domain/taxonomy";

/**
 * Deterministic, explainable recommendations. Each matching rule adds points and a short
 * human-readable reason. No hidden model: the same preferences and catalog always produce
 * the same ranking (ties break by next session date, then slug).
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
};

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
};

export type Recommendation<T extends RecCandidate> = { item: T; score: number; reasons: string[]; distance: number | null };

type Rule = { when: (p: RecPreferences, c: RecCandidate) => boolean; points: number; reason: (c: RecCandidate) => string };

const usd = (cents: number) => `$${Math.round(cents / 100)}`;

const RULES: Rule[] = [
  {
    // Following a host is the strongest signal a guest can give, so it outweighs any two other rules.
    when: (p, c) => !!c.hostSlug && (p.followedHosts ?? []).includes(c.hostSlug),
    points: 6,
    reason: (c) => `Hosted by ${c.hostName ?? "a host"}, whom you follow`,
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
    when: (p, c) => p.motivations.includes("FRIENDS") && (c.occasions.includes("BRING_A_FRIEND") || c.socialAtmosphere === "BRING_YOUR_PEOPLE"),
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
  {
    when: (p, c) => p.categories.includes(c.category),
    points: 2,
    reason: () => "In a category you chose",
  },
  {
    when: (p, c) => p.cuisines.includes(c.cuisine),
    points: 2,
    reason: (c) => `${cuisineLabel(c.cuisine)}, a cuisine you love`,
  },
];

export function recommend<T extends RecCandidate>(prefs: RecPreferences, candidates: T[], limit = 6): Recommendation<T>[] {
  const origin = getNeighborhood(prefs.locationKey);
  const results: Recommendation<T>[] = [];

  for (const c of candidates) {
    const distance = origin ? distanceMiles(origin, { lat: c.venueLat, lng: c.venueLng }) : null;
    // Radius is a hard filter when the guest chose a neighborhood and a radius.
    if (origin && prefs.travelRadiusMiles !== null && distance !== null && distance > prefs.travelRadiusMiles) continue;
    // Budget is also a hard filter, except for hosts the guest follows (they asked to see those).
    const followed = !!c.hostSlug && (prefs.followedHosts ?? []).includes(c.hostSlug);
    const budget = prefs.maxBudgetCents ?? null;
    if (budget !== null && c.priceCents !== undefined && c.priceCents > budget && !followed) continue;

    let score = 0;
    const reasons: string[] = [];
    for (const rule of RULES) {
      if (rule.when(prefs, c)) {
        score += rule.points;
        reasons.push(rule.reason(c));
      }
    }
    if (budget !== null && c.priceCents !== undefined && c.priceCents <= budget && score > 0) {
      score += 1;
      reasons.push(`${usd(c.priceCents)}, within your ${usd(budget)} budget`);
    }
    if (origin && distance !== null) {
      const proximity = distance <= 2 ? 2 : distance <= 5 ? 1 : 0;
      if (proximity) {
        score += proximity;
        reasons.push(`${distance.toFixed(1)} mi from ${origin.name}`);
      }
    }
    if (score > 0) results.push({ item: c, score, reasons, distance });
  }

  return results
    .sort(
      (a, b) =>
        b.score - a.score ||
        (a.item.nextStartsAt?.getTime() ?? Infinity) - (b.item.nextStartsAt?.getTime() ?? Infinity) ||
        a.item.slug.localeCompare(b.item.slug),
    )
    .slice(0, limit);
}
