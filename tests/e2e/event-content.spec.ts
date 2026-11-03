import pg from "pg";

import { expect, test } from "./helpers";

const DB = process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/tastable_e2e";
const NOW = process.env.TASTABLE_FIXED_NOW ?? "2026-11-02T17:00:00.000Z";

async function firstSessionStart(slug: string) {
  const client = new pg.Client({ connectionString: DB });
  await client.connect();
  try {
    const { rows } = await client.query<{ startsAt: Date }>(
      `SELECT s."startsAt" FROM "ExperienceSession" s JOIN "Experience" e ON e.id = s."experienceId"
       WHERE e.slug = $1 AND s.status = 'SCHEDULED' AND s."startsAt" > $2 ORDER BY s."startsAt" LIMIT 1`,
      [slug, NOW],
    );
    return rows[0].startsAt;
  } finally {
    await client.end();
  }
}
const nyTime = (d: Date) => new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }).format(d);

test("event pages show the structured menu by category, dietary labels and the itinerary in New York time", async ({ page }) => {
  await page.goto("/experiences/italian-pasta-making-workshop");
  const cook = page.getByRole("region", { name: "What You'll Cook" });
  await expect(cook.getByRole("region", { name: "What you'll make" }).getByText("Three pasta shapes")).toBeVisible();
  await expect(cook.getByRole("listitem").filter({ hasText: "Three pasta shapes" }).getByText("Vegetarian")).toBeVisible();
  const timeline = page.getByRole("region", { name: "Your Experience" });
  // Step times follow the session start, in New York time.
  await expect(timeline.getByRole("listitem").first()).toContainText(nyTime(await firstSessionStart("italian-pasta-making-workshop")));
  await expect(timeline.getByText(/New York time/)).toBeVisible();

  await page.goto("/experiences/wine-and-cheese-social");
  await expect(page.getByRole("region", { name: "What You'll Enjoy" }).getByText("Six wine and cheese pairings")).toBeVisible();

  await page.goto("/experiences/east-village-taco-pop-up");
  const menu = page.getByRole("region", { name: "The Menu" });
  await expect(menu.getByText(/Menu subject to change/)).toBeVisible();
  // Menu item photo (rendered as an image, or its description if the remote photo can't load).
  await expect(menu.getByRole("img", { name: "Tacos on a plate" }).or(menu.getByText("Tacos on a plate"))).toBeAttached();

  await page.goto("/experiences/secret-location-tasting-dinner");
  await expect(page.getByRole("region", { name: "The Menu" }).getByText("Menu to be announced")).toBeVisible();
  await expect(page.getByRole("region", { name: "The Menu" }).getByText("Seasonal tasting menu")).toHaveCount(0);
});

test("Tastable's event images load on cards and detail pages, on desktop and mobile", async ({ page, request }) => {
  const { ALL_EVENT_IMAGE_FILES, EVENT_IMAGE_DIR } = await import("../../src/lib/domain/event-images");
  for (const file of ALL_EVENT_IMAGE_FILES) {
    const res = await request.get(`${EVENT_IMAGE_DIR}/${file}`);
    expect(res.status(), file).toBe(200);
  }
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/discover");
    const card = page.getByRole("article").filter({ has: page.getByRole("link", { name: "Italian Pasta-Making Workshop" }) });
    const cover = card.getByRole("img", { name: "Hands lifting fresh pasta from a floured board" }).first();
    await card.first().scrollIntoViewIfNeeded().catch(() => {});
    await expect(cover).toBeAttached();
    await expect.poll(() => cover.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)).toBeGreaterThan(0);
    expect(await cover.evaluate((img: HTMLImageElement) => getComputedStyle(img).objectFit)).toBe("cover");

    // Second batch: the taco pop-up's own cover, and detail images in the gallery.
    const taco = page.getByRole("article").filter({ has: page.getByRole("link", { name: "One-Night Taco Pop-Up" }) }).getByRole("img", { name: /Three tacos with lime/ }).first();
    await expect(taco).toBeAttached();

    await page.goto("/experiences/italian-pasta-making-workshop");
    if (viewport.width > 640) await expect(page.getByRole("img", { name: "Guests cooking together around a kitchen counter" }).first()).toBeVisible();
    const hero = page.getByRole("img", { name: "Hands lifting fresh pasta from a floured board" }).first();
    await expect(hero).toBeVisible();
    await expect.poll(() => hero.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)).toBeGreaterThan(0);
  }
});
