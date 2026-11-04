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
  // The sample data has nothing on Tuesday Nov 3: a helpful empty state, not other days.
  await expect(page.getByText("No experiences match these filters")).toBeVisible();
  await expect(page.getByRole("link", { name: "Clear all filters" })).toBeVisible();
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
  await expect(chips.getByRole("link", { name: /Remove filter: Nov 28 – Dec 2/ })).toBeVisible();

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
});
