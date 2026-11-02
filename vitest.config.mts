import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Unit tests (pure logic) and integration tests (services against a real, freshly seeded
 * Postgres database, tastable_test by default; override with TEST_DATABASE_URL). The clock is frozen so results are deterministic.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "server-only": path.resolve(import.meta.dirname, "tests/support/empty.ts"),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    globalSetup: ["tests/support/global-setup.ts"],
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/tastable_test",
      TASTABLE_FIXED_NOW: "2026-11-02T17:00:00.000Z",
      DEMO_AUTH_SECRET: "test-secret",
      SIMULATED_PAYMENTS_MODE: "succeed",
    },
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 180_000,
  },
});
