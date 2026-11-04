/**
 * Checks that every placeholder photo URL in the library still resolves (HTTP 200).
 * Read-only; needs network access to images.unsplash.com. Usage: npm run images:check
 */
import { PHOTOS } from "../src/lib/domain/photos";

async function main() {
  let failed = 0;
  for (const [key, p] of Object.entries(PHOTOS)) {
    try {
      const res = await fetch(p.src, { method: "HEAD" });
      if (!res.ok) failed++;
      console.log(`${res.ok ? "ok  " : "FAIL"} ${res.status} ${key}`);
    } catch (e) {
      failed++;
      console.log(`FAIL ---  ${key} (${(e as Error).message})`);
    }
  }
  if (failed) {
    console.error(`${failed} photo URL(s) did not load. Replace them in src/lib/domain/photos.ts.`);
    process.exit(1);
  }
}

main();
