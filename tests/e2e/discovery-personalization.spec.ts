import pg from "pg";

import { expect, test, signInAs } from "./helpers";

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

test("favorites counter: unique savers, toggles, persists, never negative", async ({ page }) => {
  await signInAs(page, /Zoe .*demo guest/);
  await page.goto("/experiences/wine-and-cheese-social");
  const [{ n }] = await query<{ n: number }>(`SELECT count(*)::int n FROM "SavedExperience" s JOIN "Experience" e ON e.id = s."experienceId" WHERE e.slug = 'wine-and-cheese-social'`);
  const stored = async () => (await query<{ c: number }>(`SELECT "saveCount" c FROM "Experience" WHERE slug = 'wine-and-cheese-social'`))[0].c;
  const button = page.getByRole("button", { name: /Save Natural Wine|Remove Natural Wine/ }).first();
  const count = button.getByTestId("save-count");
  await expect(count).toHaveText(String(n));
  await button.click();
  await expect(count).toHaveText(String(n + 1));
  await expect(button).toHaveAttribute("aria-pressed", "true");
  await expect.poll(stored).toBe(n + 1);
  await page.reload();
  await expect(page.getByRole("button", { name: /Remove Natural Wine/ }).first().getByTestId("save-count")).toHaveText(String(n + 1));
  await page.getByRole("button", { name: /Remove Natural Wine/ }).first().click();
  await expect(page.getByRole("button", { name: /Save Natural Wine/ }).first().getByTestId("save-count")).toHaveText(String(n));
  await expect.poll(stored).toBe(n);
  await page.reload();
  await expect(page.getByRole("button", { name: /Save Natural Wine/ }).first().getByTestId("save-count")).toHaveText(String(n));
});

test("host ratings match verified reviews on cards and event pages; hosts without reviews say New host", async ({ page }) => {
  await page.goto("/experiences/italian-pasta-making-workshop");
  const [row] = await query<{ avg: string; n: number }>(
    `SELECT round(avg(r.rating)::numeric, 1)::text avg, count(*)::int n FROM "Review" r JOIN "Experience" e ON e."hostId" = r."hostId"
     WHERE e.slug = 'italian-pasta-making-workshop' AND r."verifiedAttendance" AND r.status <> 'REMOVED'`,
  );
  const label = `${Number(row.avg).toFixed(1)} (${row.n} reviews)`;
  await expect(page.getByRole("region", { name: "Your host" }).getByText(label)).toBeVisible();
  await page.goto("/discover");
  const card = page.getByRole("article").filter({ has: page.getByRole("link", { name: "Italian Pasta-Making Workshop" }) });
  await expect(card.getByText(label)).toBeVisible();

  // A host with no reviews shows empty stars and "New host".
  await query(`UPDATE "Review" SET status = 'REMOVED' WHERE "hostId" = (SELECT "hostId" FROM "Experience" WHERE slug = 'wine-and-cheese-social')`);
  await page.goto("/experiences/wine-and-cheese-social");
  await expect(page.getByRole("region", { name: "Your host" }).getByText("New host")).toBeVisible();
  await expect(page.getByRole("region", { name: "Your host" }).getByRole("img", { name: "No reviews yet" })).toBeVisible();
});

test("Recommended for You explains itself and discovery stays complete", async ({ page }) => {
  await signInAs(page, /Jordan .*demo guest/);
  await page.goto("/");
  const section = page.locator("section", { has: page.getByRole("heading", { name: "Picked for you, Jordan" }) });
  await expect(section.getByText(/^Why: /).first()).toBeVisible();
  await expect(section.getByText(/favorite dishes|Matches your love for|when you like to go out|In a category you chose/).first()).toBeVisible();
  for (const why of await section.getByText(/^Why: /).allTextContents()) expect(why).not.toMatch(/\d+ ?min/);

  // Personal ordering never hides listings.
  await page.goto("/discover");
  const results = page.getByRole("list", { name: "Results" }).getByRole("article");
  await expect(results.first()).toBeVisible();
  const personal = await results.count();
  await expect(page.getByText(/using your preferences to order results \(nothing is hidden\)/)).toBeVisible();
  await page.goto("/discover?sort=soonest");
  await expect(results.first()).toBeVisible();
  await expect(results).toHaveCount(personal);
});
