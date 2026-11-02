import { execSync } from "node:child_process";
import path from "node:path";

/** Builds a fresh test database: apply migrations, then run the deterministic seed. */
export default function setup() {
  const root = path.resolve(__dirname, "../..");
  const env = { ...process.env, DATABASE_URL_UNPOOLED: "", DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/tastable_test", TASTABLE_FIXED_NOW: "2026-11-02T17:00:00.000Z" };
  execSync("node tests/support/reset-test-db.mjs", { cwd: root, env, stdio: "pipe" });
  execSync("npx prisma migrate deploy", { cwd: root, env, stdio: "pipe" });
  execSync("npx tsx prisma/seed.ts", { cwd: root, env, stdio: "pipe" });
}
