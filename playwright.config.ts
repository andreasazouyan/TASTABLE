import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against a production build on port 3200 with its own database
 * (Postgres tastable_e2e by default), freshly migrated and seeded, and a frozen server clock.
 */
const PORT = 3200;
const env = {
  DATABASE_URL: process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/tastable_e2e",
  TASTABLE_FIXED_NOW: "2026-11-02T17:00:00.000Z",
  DEMO_AUTH_SECRET: "e2e-secret",
  SIMULATED_PAYMENTS_MODE: "succeed",
  NEXT_PUBLIC_APP_URL: `http://localhost:${PORT}`,
};

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    // Optional: point at a preinstalled Chromium instead of running `npx playwright install`.
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } } : {}),
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /responsive/ },
    { name: "responsive", testMatch: /responsive/, use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `node tests/e2e/prepare-db.mjs && npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/sign-in`,
    timeout: 300_000,
    reuseExistingServer: !!process.env.PW_REUSE_SERVER,
    env,
  },
});
