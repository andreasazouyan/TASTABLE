/**
 * Resolves the Postgres connection string from whichever variable the host provides.
 * Vercel's Neon integration sets DATABASE_URL by default, but older Vercel Postgres stores and
 * custom prefixes use POSTGRES_* names, so those are accepted too.
 */
const POOLED = ["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL", "STORAGE_DATABASE_URL", "STORAGE_URL"] as const;
const DIRECT = ["DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING", "STORAGE_DATABASE_URL_UNPOOLED"] as const;

function firstSet(names: readonly string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  return undefined;
}

/** Connection string for the running app (pooled when available). */
export function databaseUrl() {
  return firstSet(POOLED);
}

/** Connection string for migrations and seeding (direct/unpooled when available). */
export function directDatabaseUrl() {
  return firstSet(DIRECT) ?? firstSet(POOLED);
}

export const DATABASE_URL_NAMES = [...POOLED, ...DIRECT];
