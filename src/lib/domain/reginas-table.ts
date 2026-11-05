/**
 * Regina's Table: the special, complimentary Tastable demo event (Thursday, November 19, 2026)
 * with its own reservation flow: every reservation is exactly two guests (you and a +1), each
 * guest picks a main course, and the total is always $0.
 *
 * Single source of truth for the event's identity and rules, shared by the seed, the
 * reservation service, the pages and the developer-only reset.
 */
export const REGINA_SLUG = "reginas-table-supper-club";
export const REGINA_SESSION_ID = "ses_reginas-table-supper-club";
export const REGINA_HOST_SLUG = "regina";

/** One-time session: 8:30–11:00 PM New York time. */
export const REGINA_DATE = "2026-11-19";
export const REGINA_START = { hour: 20, minute: 30 };
export const REGINA_DURATION_MINUTES = 150;
export const REGINA_CAPACITY = 15;
/** Seats already taken when the demo starts (and after a reset): 15 - 9 = 6 left, 3 pairs. */
export const REGINA_SEEDED_SEATS = 9;
/** Bookings created by the seed carry this id prefix; the reset never touches them. */
export const REGINA_SEEDED_BOOKING_PREFIX = "bkg_regina_";

export const REGINA_PARTY_SIZE = 2;
export const REGINA_PRICE_NOTE = "Complimentary experience — Special Tastable Demo Event";
export const REGINA_BOOK_LABEL = "Reserve for 2 — Free";
export const REGINA_CONFIRMED_TITLE = "You're on the guest list!";
export const REGINA_ADDRESS = "500 Riverside Drive, Manhattan, NY 10027";

export const REGINA_MAINS = [
  { key: "MEAT_SAUCE", label: "Pasta with meat sauce" },
  { key: "PESTO", label: "Vegetarian pesto pasta" },
] as const;
export type ReginaMainKey = (typeof REGINA_MAINS)[number]["key"];

export function reginaMainLabel(key: string) {
  return REGINA_MAINS.find((m) => m.key === key)?.label ?? null;
}

export function isReginasTable(slug: string | null | undefined) {
  return slug === REGINA_SLUG;
}

/**
 * The developer-only reset is available in development, or anywhere TASTABLE_DEMO_TOOLS=true
 * (for example on the hosted demo, set in the Vercel project's environment variables).
 */
export function demoToolsEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.TASTABLE_DEMO_TOOLS === "true";
}
