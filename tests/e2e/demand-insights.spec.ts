import pg from "pg";

import { expect, signInAs, test } from "./helpers";

const DB = process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/tastable_e2e";
async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const client = new pg.Client({ connectionString: DB });
  await client.connect();
  try {
    return (await client.query(sql, params)).rows as T[];
  } finally {
    await client.end();
  }
}

type DishRow = { id: string; preferencesId: string; dishKey: string; customName: string | null; isCustom: boolean; sortOrder: number; createdAt: Date };
let backup: DishRow[] = [];
let prefIds: string[] = [];

// Background demo guests only (not the personas other specs rely on).
test.beforeAll(async () => {
  prefIds = (await query<{ id: string }>(`SELECT id FROM "GuestPreferences" WHERE "guestProfileId" LIKE 'gst_bg-%' ORDER BY "guestProfileId"`)).map((r) => r.id);
  backup = await query<DishRow>(`SELECT * FROM "GuestFavoriteDish" WHERE "preferencesId" = ANY($1)`, [prefIds]);
});

test.afterAll(async () => {
  await query(`DELETE FROM "GuestFavoriteDish" WHERE "preferencesId" = ANY($1)`, [prefIds]);
  for (const r of backup) {
    await query(`INSERT INTO "GuestFavoriteDish" (id, "preferencesId", "dishKey", "customName", "isCustom", "sortOrder", "createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7)`, [
      r.id,
      r.preferencesId,
      r.dishKey,
      r.customName,
      r.isCustom,
      r.sortOrder,
      r.createdAt,
    ]);
  }
});

test("Culinary Demand Insights: aggregated sections, Pizza & Ice Cream re-ranking, combined filters, privacy", async ({ page }) => {
  await signInAs(page, "Maya Chen");
  await page.goto("/host");
  await page.getByRole("link", { name: "Demand Insights" }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Culinary Demand Insights" })).toBeVisible();
  await expect(page.getByText("Simulated data.").filter({ visible: true })).toBeVisible();
  for (const h of ["Audience overview", "Smart insights", "Experience demand", "Cuisine demand", "Most requested dishes", "When guests want to go out", "Social preferences", "Location insights"]) {
    await expect(page.getByRole("heading", { level: 2, name: h })).toBeVisible();
  }

  // All four categories are compared, with interest kept apart from bookings.
  const categories = page.getByRole("table", { name: "Interest in each experience category" });
  for (const c of ["Supper Clubs & Private Dining", "Cooking Classes & Workshops", "Pop-Ups & Exclusive Experiences", "Social Culinary Experiences"]) {
    await expect(categories.getByRole("rowheader", { name: c })).toBeVisible();
  }
  await expect(categories.getByRole("columnheader", { name: "Guests who booked one" })).toBeVisible();
  await expect(page.getByRole("table", { name: /Guests who chose both the day/ })).toContainText("10:00 PM–12:00 AM");
  const dishTable = page.getByRole("table", { name: "Top 10 dishes" });
  await expect(dishTable.getByRole("rowheader").first()).not.toContainText("Pizza");

  // Several demo guests switch their favorites to Pizza and Ice Cream: the rankings follow.
  await query(`DELETE FROM "GuestFavoriteDish" WHERE "preferencesId" = ANY($1)`, [prefIds]);
  for (const [i, id] of prefIds.entries()) {
    await query(`INSERT INTO "GuestFavoriteDish" (id, "preferencesId", "dishKey", "isCustom", "sortOrder") VALUES ($1, $2, 'pizza', false, 0)`, [`e2e_pz_${id}`, id]);
    if (i >= 3) await query(`INSERT INTO "GuestFavoriteDish" (id, "preferencesId", "dishKey", "isCustom", "sortOrder") VALUES ($1, $2, 'ice-cream', false, 1)`, [`e2e_ic_${id}`, id]);
  }
  await page.reload();
  const rows = dishTable.getByRole("rowheader");
  await expect(rows.nth(0)).toContainText("Pizza");
  await expect(rows.nth(1)).toContainText("Ice cream");
  await expect(page.getByText("Most requested dish", { exact: true }).locator("..")).toContainText("Pizza");
  await expect(page.getByRole("list", { name: "Smart insights" })).toContainText("Pizza is the most requested dish among this audience.");
  await expect(page.getByRole("list", { name: "Smart insights" })).toContainText(`${prefIds.length} of `);

  // Filters combine.
  const eligible = Number(await page.getByText("Eligible guests", { exact: true }).locator("..").locator("p").nth(1).textContent());
  await page.getByLabel("Preferred day").selectOption("SAT");
  await page.getByLabel("Preferred time slot").selectOption("18-20");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/day=SAT/);
  await expect(page).toHaveURL(/time=18-20/);
  await expect(page.getByLabel("Preferred day")).toHaveValue("SAT");
  const segment = Number(await page.getByText("In this audience", { exact: true }).locator("..").locator("p").nth(1).textContent());
  expect(segment).toBeGreaterThanOrEqual(10);
  expect(segment).toBeLessThan(eligible);
  await expect(page.getByRole("table", { name: "Preferred days" }).getByRole("row").filter({ hasText: "Saturday" })).toContainText(String(segment));

  // Privacy: a narrow audience shows no breakdown at all.
  await page.goto("/host/insights?neighborhood=astoria&cuisine=korean&day=SUN&time=12-14");
  await expect(page.getByRole("heading", { name: "Audience too small to show" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Most requested dishes" })).toHaveCount(0);
  await expect(page.getByRole("list", { name: "Smart insights" })).toHaveCount(0);
  const text = await page.locator("main").innerText();
  expect(text).not.toMatch(/Jordan|Zoe Park|Sofia Marin|@example\.com/);
  await page.getByRole("link", { name: "Clear filters" }).click();
  await expect(page).toHaveURL(/\/host\/insights$/);
});
