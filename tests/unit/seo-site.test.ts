import { afterEach, describe, expect, it, vi } from "vitest";

import { indexingAllowed, siteUrl, snippet } from "@/lib/seo/site";

afterEach(() => vi.unstubAllEnvs());

describe("siteUrl", () => {
  it("prefers NEXT_PUBLIC_SITE_URL, then the Vercel production domain", () => {
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "tastable.vercel.app");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(siteUrl()).toBe("https://tastable.vercel.app");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://tastable.nyc/");
    expect(siteUrl()).toBe("https://tastable.nyc");
  });
});

describe("indexingAllowed", () => {
  it("allows only the production deployment by default", () => {
    vi.stubEnv("TASTABLE_ALLOW_INDEXING", "");
    vi.stubEnv("VERCEL_ENV", "production");
    expect(indexingAllowed()).toBe(true);
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(indexingAllowed()).toBe(false);
    vi.stubEnv("VERCEL_ENV", "");
    expect(indexingAllowed()).toBe(false);
  });

  it("honours the explicit override", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("TASTABLE_ALLOW_INDEXING", "true");
    expect(indexingAllowed()).toBe(true);
  });
});

describe("snippet", () => {
  it("keeps short text and trims long text on a word boundary", () => {
    expect(snippet("  A   short line ")).toBe("A short line");
    const long = "word ".repeat(60);
    const out = snippet(long);
    expect(out.length).toBeLessThanOrEqual(160);
    expect(out.endsWith("word…")).toBe(true);
  });
});

describe("PRIVATE_PATHS", () => {
  it("blocks the host dashboard without blocking public /hosts/ profiles", async () => {
    const { PRIVATE_PATHS } = await import("@/lib/seo/site");
    const blocks = (path: string) =>
      PRIVATE_PATHS.some((rule) => {
        const exact = rule.endsWith("$");
        const pattern = "^" + rule.replace(/\$$/, "").replace(/[.+?^{}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + (exact ? "$" : "");
        return new RegExp(pattern).test(path);
      });
    expect(blocks("/host")).toBe(true);
    expect(blocks("/host/events")).toBe(true);
    expect(blocks("/hosts/regina")).toBe(false);
    expect(blocks("/experiences/x/book")).toBe(true);
    expect(blocks("/experiences/x")).toBe(false);
  });
});
