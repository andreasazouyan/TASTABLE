// Fresh database for E2E runs: reset the schema, apply migrations, seed fictional data.
import { execSync } from "node:child_process";

execSync("node tests/support/reset-test-db.mjs", { stdio: "inherit" });
execSync("npx prisma migrate deploy", { stdio: "inherit" });
execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });
