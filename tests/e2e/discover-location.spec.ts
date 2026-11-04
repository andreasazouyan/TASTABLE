import type { Page } from "@playwright/test";

import { expect, test } from "./helpers";
import { neighborhoodsIn } from "../../src/lib/domain/neighborhoods";

const names = (b: Parameters<typeof neighborhoodsIn>[0]) => neighborhoodsIn(b).map((n) => n.name);

async function results(page: Page) {
  const list = page.getByRole("list", { name: "Results" });
  await expect(list.getByRole("article").first()).toBeVisible();
  const cards = await list.getByRole("article").allInnerTexts();
  // The count shown matches the cards listed.
  await expect(page.getByRole("heading", { name: new RegExp(`^${cards.length} experiences?$`) })).toBeVisible();
  return cards;
}
const expectAllIn = (cards: string[], allowed: string[]) => {
  for (const c of cards) expect(allowed.some((n) => c.split("\n").includes(n)), c.split("\n").slice(0, 8).join(" | ")).toBe(true);
};

test("borough and neighborhood filter: multi-select, select all, clear and other filters", async ({ page }) => {
  await page.goto("/discover");
  const aside = page.getByRole("complementary", { name: "Filters" });
  const boroughs = aside.getByRole("group", { name: "Boroughs" });

  await boroughs.getByText("Manhattan", { exact: true }).click();
  await page.waitForURL(/borough=manhattan/);
  expectAllIn(await results(page), names("manhattan"));

  // Neighborhoods appear for the chosen borough; pick two.
  const manhattan = aside.getByRole("list", { name: "Manhattan neighborhoods" });
  await manhattan.getByLabel("SoHo", { exact: true }).check();
  await page.waitForURL(/neighborhood=soho/);
  await manhattan.getByLabel("Harlem", { exact: true }).check();
  await page.waitForURL(/neighborhood=soho%2Charlem|neighborhood=soho,harlem/);
  expectAllIn(await results(page), ["SoHo", "Harlem"]);
  const chips = page.getByRole("list", { name: "Active filters" });
  await expect(chips.getByRole("link", { name: "Remove filter: SoHo" })).toBeVisible();
  await expect(chips.getByRole("link", { name: "Remove filter: Harlem" })).toBeVisible();

  // A second borough with no neighborhoods ticked adds all of it.
  await boroughs.getByText("Brooklyn", { exact: true }).click();
  await page.waitForURL(/borough=manhattan%2Cbrooklyn|borough=manhattan,brooklyn/);
  const mixed = await results(page);
  expectAllIn(mixed, ["SoHo", "Harlem", ...names("brooklyn")]);
  expect(mixed.some((c) => names("brooklyn").some((n) => c.split("\n").includes(n)))).toBe(true);
  await expect(chips.getByRole("link", { name: "Remove filter: Brooklyn" })).toBeVisible();

  // Combines with category.
  await aside.getByLabel("Cooking Classes & Workshops").check();
  await page.waitForURL(/category=classes/);
  expectAllIn(await results(page), ["SoHo", "Harlem", ...names("brooklyn")]);
  await aside.getByLabel("Cooking Classes & Workshops").uncheck();
  await page.waitForURL((u) => !u.search.includes("category="));

  // Clear the Manhattan neighborhoods: all of Manhattan again.
  await aside.getByRole("button", { name: "Clear Manhattan neighborhoods" }).click();
  await page.waitForURL((u) => !u.search.includes("neighborhood="));
  await expect(page).toHaveURL(/borough=manhattan/);
  expectAllIn(await results(page), [...names("manhattan"), ...names("brooklyn")]);

  // Select all in Brooklyn ticks every Brooklyn neighborhood.
  await aside.getByRole("button", { name: "Select all in Brooklyn" }).click();
  await page.waitForURL(/neighborhood=williamsburg/);
  await expect(aside.getByRole("list", { name: "Brooklyn neighborhoods" }).getByRole("checkbox", { checked: false })).toHaveCount(0);

  // Removing a chip, then unticking a borough, drops it from the URL.
  await boroughs.getByText("Brooklyn", { exact: true }).click();
  await page.waitForURL((u) => !u.search.includes("brooklyn") && !u.search.includes("neighborhood="));
  await chips.getByRole("link", { name: "Remove filter: Manhattan" }).click();
  await page.waitForURL((u) => !u.search.includes("borough="));
});

test("no matches shows a helpful empty state that clears the location", async ({ page }) => {
  await page.goto("/discover?borough=staten-island&category=classes");
  await expect(page.getByText("No experiences match these filters")).toBeVisible();
  await page.getByRole("link", { name: "Search all of NYC" }).click();
  await page.waitForURL((u) => !u.search.includes("borough=") && u.search.includes("category=classes"));
  await results(page);
});
