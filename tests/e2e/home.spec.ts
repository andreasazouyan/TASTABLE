import { expect, expectNoHorizontalScroll, signInAs, test } from "./helpers";

test("Home is a personalized set of carousels with See all links", async ({ page }) => {
  await signInAs(page, /Zoe .*demo guest/, "/");
  await page.goto("/");

  // No hero banner: search sits under the navigation and searches Discover.
  await expect(page.getByRole("main").getByText("Discover experiences worth sharing.", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What are you in the mood for?");
  const search = page.getByRole("search", { name: "Search experiences" });
  await expect(search.getByPlaceholder("Search experiences, cuisines, neighborhoods...")).toBeVisible();

  const categories = page.getByRole("region", { name: "What are you in the mood for?" });
  await expect(categories.getByRole("link", { name: /Cooking Classes & Workshops: \d+ available/ })).toHaveAttribute("href", "/discover?category=classes");

  const recommended = page.getByRole("region", { name: "Recommended for you" });
  await expect(recommended.getByText("Handpicked experiences based on your tastes.")).toBeVisible();
  await expect(recommended.getByText(/^Why: /).first()).toBeVisible();
  const popular = page.getByRole("region", { name: "Popular in NYC" });
  await expect(popular.getByText("#1", { exact: true })).toBeVisible();
  await expect(popular.getByText("See what everyone's loving.")).toBeVisible();
  await expect(popular.getByRole("link", { name: /See all/ })).toHaveAttribute("href", "/discover?sort=popular");

  // Zoe chose the East Village during onboarding.
  const area = page.getByRole("region", { name: "Experiences in Manhattan" });
  await expect(area.getByRole("link", { name: /See all/ })).toHaveAttribute("href", "/discover?borough=manhattan");

  const featured = page.getByRole("region", { name: "Featured experiences" });
  await expect(featured.getByText("Featured", { exact: true }).first()).toBeVisible();
  await expect(featured.getByRole("link", { name: /See all/ })).toHaveAttribute("href", "/discover?collection=featured");

  // No duplicate cards within a section.
  for (const region of [popular, area, featured]) {
    const titles = await region.locator("article h3").allTextContents();
    expect(new Set(titles).size).toBe(titles.length);
    expect(titles.length).toBeGreaterThanOrEqual(4);
    expect(titles.length).toBeLessThanOrEqual(6);
  }

  await popular.locator("article h3 a").first().click();
  await expect(page).toHaveURL(/\/experiences\//);
});

test("Home falls back without preferences", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Recommended for you" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Personalise Tastable/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Explore NYC" })).toBeVisible();
});

test("Home carousels fit a phone screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Popular in NYC" })).toBeVisible();
  await expectNoHorizontalScroll(page);
});

test("Home search finds experiences by category, cuisine, host and neighborhood", async ({ page }) => {
  await page.goto("/");
  for (const [q, title] of [
    ["supper club", "Candlelit Tasting for Two"],
    ["west african", "Art Gallery Dinner Collaboration"],
    ["Luca Moretti", "Italian Pasta-Making Workshop"],
    ["Red Hook", "Caribbean Fire Cookout"],
  ] as const) {
    await page.goto("/");
    await page.getByRole("searchbox", { name: "Search experiences" }).fill(q);
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/discover\\?q=${encodeURIComponent(q).replace(/%20/g, "\\+")}`));
    await expect(page.getByRole("heading", { name: title }).first()).toBeVisible();
  }
});
