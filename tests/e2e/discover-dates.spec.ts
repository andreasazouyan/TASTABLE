import { expect, test } from "./helpers";

// The E2E clock is fixed at Monday 2026-11-02, 12:00 in New York.
const cardDates = async (page: import("@playwright/test").Page) => {
  const results = page.getByRole("list", { name: "Results" });
  await expect(results.getByRole("article").first()).toBeVisible();
  return results.getByRole("article").allInnerTexts();
};

test("When quick dates filter Discover, stay highlighted and combine with other filters", async ({ page }) => {
  await page.goto("/discover");
  const when = page.getByRole("complementary", { name: "Filters" }).getByRole("radiogroup", { name: "When" });

  await when.getByText("Tomorrow", { exact: true }).click();
  await page.waitForURL(/when=tomorrow/);
  await expect(when.getByRole("radio", { name: "Tomorrow" })).toBeChecked();
  // Tomorrow shows Tuesday Nov 3 only.
  for (const text of await cardDates(page)) expect(text).toMatch(/Tue, Nov 3/);
  await expect(page.getByRole("list", { name: "Active filters" }).getByRole("link", { name: "Remove filter: Tomorrow" })).toBeVisible();

  await when.getByText("This Weekend", { exact: true }).click();
  await page.waitForURL(/when=weekend/);
  for (const text of await cardDates(page)) expect(text).toMatch(/(Sat, Nov 7|Sun, Nov 8)/);

  await when.getByText("Next 3 Days", { exact: true }).click();
  await page.waitForURL(/when=next3/);
  const next3 = await cardDates(page);
  for (const text of next3) expect(text).toMatch(/(Mon, Nov 2|Tue, Nov 3|Wed, Nov 4)/);

  // Combines with a category filter, and the date choice stays active.
  await page.getByRole("complementary", { name: "Filters" }).getByLabel("Cooking Classes & Workshops").check();
  await page.waitForURL(/category=classes/);
  await expect(page).toHaveURL(/when=next3/);
  await expect(when.getByRole("radio", { name: "Next 3 Days" })).toBeChecked();

  // Choose Dates reveals the date picker; a single date across the month boundary.
  await page.getByRole("complementary", { name: "Filters" }).getByLabel("Cooking Classes & Workshops").uncheck();
  await when.getByText("Choose Dates", { exact: true }).click();
  const aside = page.getByRole("complementary", { name: "Filters" });
  await aside.getByLabel("From", { exact: true }).fill("2026-11-28");
  await aside.getByLabel("To", { exact: true }).fill("2026-12-02");
  await page.waitForURL(/to=2026-12-02/);
  await expect(page).toHaveURL(/when=custom/);
  const chips = page.getByRole("list", { name: "Active filters" });
  await expect(chips.getByRole("link", { name: /Remove filter: Sat, Nov 28 – Wed, Dec 2/ })).toBeVisible();

  // Clear Dates removes only the date filter.
  await aside.getByRole("button", { name: "Clear Dates" }).click();
  await page.waitForURL((u) => !u.search.includes("when="));
  await expect(when.getByRole("radio", { name: "Tomorrow" })).not.toBeChecked();
  await expect(aside.getByLabel("From", { exact: true })).toHaveCount(0);
});

test("a shared ?date= link shows that day only, with Choose Dates active", async ({ page }) => {
  await page.goto("/discover?date=2026-11-05");
  const when = page.getByRole("complementary", { name: "Filters" }).getByRole("radiogroup", { name: "When" });
  await expect(when.getByRole("radio", { name: "Choose Dates" })).toBeChecked();
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
