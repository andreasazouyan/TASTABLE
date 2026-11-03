import type { Availability } from "@/lib/booking/capacity";

/** A published experience flattened for discovery, cards and recommendations. */
export type ListingSession = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  seatsLeft: number;
  priceCents: number;
  availability: Availability;
};

export type Listing = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  cuisine: string;
  tags: string[];
  dietary: string[];
  atmosphere: string;
  format: string;
  occasions: string[];
  featured: boolean;
  isFictional: boolean;
  publishedAt: Date | null;
  durationMinutes: number;
  ticketPriceCents: number;
  host: { id: string; slug: string; displayName: string; hostType: string; verified: boolean; followerCount: number };
  /** Average of verified reviews (one shared calculation, src/lib/reviews.ts). */
  hostRating: { average: number | null; count: number; isNew: boolean };
  /** Featured dish keys. */
  dishes: string[];
  venue: { name: string; type: string; neighborhood: string; borough: string; lat: number; lng: number; isSecret: boolean };
  photo: { url: string; alt: string } | null;
  coverTheme: string;
  /** Upcoming, non-cancelled sessions in date order. */
  sessions: ListingSession[];
  /** Unique guests who saved this experience. */
  saves: number;
  views: number;
};

/** A listing plus the session that matched the active filters (shown on the card). */
export type ListingMatch = Listing & { matched: ListingSession | null; matchedCount: number; distance: number | null };
