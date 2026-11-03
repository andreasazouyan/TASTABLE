import { test as base, expect, type Page } from "@playwright/test";

/**
 * Test fixture that skips remote photography (the <Photo> fallback covers it), so runs are
 * fast and work offline. Tastable's own local event images still load.
 */
export const test = base.extend<{ blockImages: void }>({
  blockImages: [
    async ({ page }, use) => {
      await page.route(/images\.unsplash\.com|\/_next\/image\?url=https/, (route) => route.abort());
      await use();
    },
    { auto: true },
  ],
});
export { expect };

/** Demo sign-in through the persona picker (no passwords in this prototype). */
export async function signInAs(page: Page, title: string | RegExp, next?: string) {
  await page.goto(next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in");
  await page.getByRole("button", { name: title }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"));
}

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, `horizontal overflow on ${page.url()}`).toBeLessThanOrEqual(1);
}
