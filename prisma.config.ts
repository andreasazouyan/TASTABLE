import "dotenv/config";
import { defineConfig } from "prisma/config";

import { directDatabaseUrl } from "./src/lib/database-url";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations prefer the direct (unpooled) Neon URL when the Vercel integration provides one.
    // Falls back to a local default so `npm install` (which runs prisma generate) works before .env exists.
    url: directDatabaseUrl() ?? "postgresql://postgres:postgres@localhost:5432/tastable",
  },
});
