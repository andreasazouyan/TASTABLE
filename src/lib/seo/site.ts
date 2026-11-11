/**
 * Public site URL and indexing switches, used by metadata, robots.txt and sitemap.xml.
 *
 * NEXT_PUBLIC_SITE_URL wins (set it when a custom domain is added). On Vercel the production
 * domain comes from VERCEL_PROJECT_PRODUCTION_URL, so canonical links never point at a preview URL.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return (process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000").replace(/\/+$/, "");
}

/** Only the production deployment may be indexed; preview deployments and local builds stay out of search. */
export function indexingAllowed(): boolean {
  if (process.env.TASTABLE_ALLOW_INDEXING === "true") return true;
  if (process.env.TASTABLE_ALLOW_INDEXING === "false") return false;
  return process.env.VERCEL_ENV === "production";
}

/** Pages that are personal, transactional or token-gated. Kept out of search results. */
export const PRIVATE_PATHS = [
  "/host$",
  "/host/",
  "/bookings",
  "/profile",
  "/saved",
  "/calendar",
  "/onboarding",
  "/sign-in",
  "/sign-up",
  "/c/",
  "/invite/",
  "/api/",
  "/experiences/*/book",
] as const;

export const SITE_NAME = "Tastable";
export const SITE_DESCRIPTION =
  "Discover supper clubs, cooking classes, pop-ups and social food experiences in New York City. Tastable is a prototype: listings are fictional samples.";

/** Trims text to a search-snippet length on a word boundary. */
export function snippet(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:]+$/, "")}…`;
}
