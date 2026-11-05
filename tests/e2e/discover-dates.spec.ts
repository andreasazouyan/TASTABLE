import { expect, test } from "./helpers";

// The E2E clock is fixed at Monday 2026-11-02, 12:00 in New York.
const cardDates = async (page: import("@playwright/test").Page) => {
  const results = page.getByRole("list", { name: "Results" });
  await expect(results.getByRole("article").first()).toBeVisible();
  return results.getByRole("article").allInnerTexts();
};

test("the date picker filters Discover to a day or a range, keeps other filters, and clears", async ({ page }) => {
  await page.goto("/discover?category=classes");
  const aside = page.getByRole("complementary", { name: "Filters" });
  // The old When section is gone; dates live in the picker above the results.
  await expect(aside.getByRole("radiogroup", { name: "When" })).toHaveCount(0);

  await page.getByRole("button", { name: "Select dates" }).click();
  const pop = page.getByRole("dialog", { name: "Choose a date or a date range" });
  // Past days can't be picked (clock: Monday Nov 2).
  await expect(pop.getByRole("button", { name: "Sunday, November 1, 2026" })).toBeDisabled();

  // One tap: a single day, results update straight away.
  await pop.getByRole("button", { name: "Tuesday, November 3, 2026" }).click();
  await page.waitForURL(/date=2026-11-03/);
  await expect(page).toHaveURL(/category=classes/);
  await expect(page.getByRole("button", { name: "Dates: Tue, Nov 3. Change dates" })).toBeVisible();
  for (const text of await cardDates(page)) expect(text).toMatch(/Tue, Nov 3/);

  // A later day makes it a range, across the month boundary.
  await pop.getByRole("button", { name: "Next month" }).click();
  await pop.getByRole("button", { name: "Wednesday, December 2, 2026" }).click();
  await page.waitForURL(/from=2026-11-03&to=2026-12-02/);
  await expect(page.getByRole("button", { name: "Dates: Nov 3 – Dec 2. Change dates" })).toBeVisible();
  await expect(pop.getByRole("button", { name: "Wednesday, December 2, 2026" })).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  const chips = page.getByRole("list", { name: "Active filters" });
  await expect(chips.getByRole("link", { name: /Remove filter: Dates: Tue, Nov 3 – Wed, Dec 2/ })).toBeVisible();

  // Other filters keep the dates.
  await aside.getByLabel("Meet New People").check();
  await page.waitForURL(/occasion=MEET_NEW_PEOPLE/);
  await expect(page).toHaveURL(/from=2026-11-03&to=2026-12-02/);

  // Clear dates removes only the dates: all upcoming dates, soonest first.
  await page.getByRole("button", { name: "Clear dates" }).click();
  await page.waitForURL((u) => !u.search.includes("from=") && u.search.includes("occasion=") && u.search.includes("category=classes"));
  await expect(page.getByRole("button", { name: "Select dates" })).toBeVisible();
  await expect(page.getByLabel("Sort")).toHaveValue("soonest");
});

test("a shared ?date= link shows that day only, with the picker showing it", async ({ page }) => {
  await page.goto("/discover?date=2026-11-05");
  await expect(page.getByRole("button", { name: "Dates: Thu, Nov 5. Change dates" })).toBeVisible();
  for (const text of await cardDates(page)) expect(text).toMatch(/Thu, Nov 5/);
  await expect(page.getByRole("heading", { name: /experiences? on Thursday, November 5/ })).toBeVisible();
});

test("a date with nothing on it shows a helpful empty state, not other days", async ({ page }) => {
  await page.goto("/discover?date=2027-03-02");
  await expect(page.getByText("No experiences match these filters")).toBeVisible();
  await expect(page.getByRole("link", { name: "Clear all filters" })).toBeVisible();
});

test("Discover opens by date (Soonest First) with day headings; other sorts are one grid", async ({ page }) => {
  await page.goto("/discover");
  await expect(page.getByLabel("Sort")).toHaveValue("soonest");
  await expect(page.getByLabel("Sort").locator("option:checked")).toHaveText("Date: Soonest First");
  const results = page.getByRole("list", { name: "Results" });
  const headings = await results.locator("h3[id^='day-']").allTextContents();
  // Clock: Monday Nov 2 at noon; the sample data has sessions every day from today.
  expect(headings.slice(0, 3)).toEqual(["Today — November 2", "Tomorrow — November 3", "Wednesday, November 4"]);
  expect(new Set(headings).size).toBe(headings.length);

  // An experience with sessions on several dates appears under each date.
  const day = (label: string) => page.getByRole("region", { name: label });
  const counts = await page.getByRole("link", { name: "Italian Pasta-Making Workshop" }).count();
  expect(counts).toBeGreaterThan(1);
  // Cards within a day are in time order.
  const fri = await day("Friday, November 6").getByRole("article").allInnerTexts();
  const times = fri.map((t) => t.match(/Fri, Nov 6, (\d+):(\d+) (AM|PM)/)!).map(([, h, m, ap]) => ((+h % 12) + (ap === "PM" ? 12 : 0)) * 60 + +m);
  expect(times).toEqual([...times].sort((a, b) => a - b));

  // Filters still apply inside the grouped view.
  await page.goto("/discover?category=classes");
  for (const text of await results.getByRole("article").allInnerTexts()) expect(text).toMatch(/CLASSES/i);
  await expect(results.getByRole("heading", { level: 3 }).first()).toBeVisible();

  // Another sort removes the date headings; choosing Soonest again brings them back.
  await page.getByLabel("Sort").selectOption("price-asc");
  await page.waitForURL(/sort=price-asc/);
  await expect(results.getByRole("region")).toHaveCount(0);
  await page.getByLabel("Sort").selectOption("soonest");
  await page.waitForURL((u) => !u.search.includes("sort="));
  await expect(results.getByRole("region").first()).toBeVisible();
});
