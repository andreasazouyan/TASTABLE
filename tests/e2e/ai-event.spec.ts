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

test("AI-assisted Create Event: demand-based concept, regenerate, overwrite warning, prefill, host confirms, never auto-published", async ({ page }) => {
  await signInAs(page, "Maya Chen");
  await page.goto("/host/events/new");
  await page.getByLabel("Event title").fill("My half-finished idea");

  await page.getByRole("button", { name: "Let AI Create the Event" }).click();
  const dialog = page.getByRole("dialog", { name: "Create an experience with AI" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Turn Tastable's latest guest preferences into your next culinary experience.")).toBeVisible();
  await expect(dialog.getByTestId("generator-label")).toContainText("No AI model is connected");
  await expect(dialog.getByText("Popular cuisines")).toBeVisible();
  await expect(dialog.getByText("Most requested dishes")).toBeVisible();

  // Host inputs are validated.
  await dialog.getByLabel("Lowest ticket price").fill("120");
  await dialog.getByLabel("Highest ticket price").fill("60");
  await dialog.getByRole("button", { name: "Generate My Experience" }).click();
  await expect(dialog.getByText("The highest price must be at least the lowest")).toBeVisible();
  await dialog.getByLabel("Lowest ticket price").fill("50");
  await dialog.getByLabel("Highest ticket price").fill("90");
  await dialog.getByLabel("Target guest capacity").fill("14");
  await dialog.getByLabel("Experience category").selectOption("COOKING_CLASS_WORKSHOP");
  await dialog.getByRole("button", { name: "Generate My Experience" }).click();

  const conceptTitle = dialog.getByRole("heading", { level: 3 }).first();
  await expect(dialog.getByText("Suggested concept")).toBeVisible();
  const first = (await conceptTitle.textContent())!;
  await expect(dialog.getByText(/your range \$50–\$90/)).toBeVisible();
  await expect(dialog.getByRole("list", { name: "Suggested itinerary" }).getByRole("listitem").first()).toContainText(/\d:\d\d [AP]M/);
  await expect(dialog.getByRole("list", { name: "Demand signals used" }).getByRole("listitem").first()).toContainText(/guests/);

  await dialog.getByRole("button", { name: "Regenerate" }).click();
  await expect(conceptTitle).not.toHaveText(first);
  const chosen = (await conceptTitle.textContent())!;

  // The host already typed a title, so using the concept warns first.
  await dialog.getByRole("button", { name: "Use This Concept" }).click();
  await expect(dialog.getByText("This will replace what you've already entered: title.")).toBeVisible();
  await dialog.getByRole("button", { name: "Keep my entries" }).click();
  await expect(dialog.getByRole("button", { name: "Use This Concept" })).toBeVisible();
  await dialog.getByRole("button", { name: "Use This Concept" }).click();
  await dialog.getByRole("button", { name: "Replace and use concept" }).click();
  await expect(dialog).toBeHidden();

  // The existing form is filled in, clearly marked as suggestions, and fully editable.
  await expect(page.getByLabel("Event title")).toHaveValue(chosen);
  await expect(page.getByLabel("One-line summary")).not.toHaveValue("");
  await expect(page.getByRole("status").filter({ hasText: "Filled in from a suggested concept" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2 }).filter({ hasText: "Suggested, please confirm" })).toBeVisible();
  await page.getByLabel("Event title").fill(`${chosen} (edited)`);
  await page.getByRole("button", { name: /Dates & price/ }).click();
  await expect(page.locator("input[type=time]").first()).not.toHaveValue("");
  await page.getByRole("button", { name: /^\d?\s*Menu/ }).first().click();
  await expect(page.getByText("Menu subject to change").first()).toBeVisible();

  // Publishing needs the host's own confirmation (and the usual requirements). Nothing was saved yet.
  await page.getByRole("button", { name: /Review$/ }).click();
  await expect(page.getByText("Your confirmation of the suggested details")).toBeVisible();
  await expect(page.getByRole("button", { name: "Publish event" })).toBeDisabled();
  await page.getByRole("checkbox", { name: /I've confirmed the venue, date and time/ }).check();
  await expect(page.getByText("Your confirmation of the suggested details")).toHaveCount(0);
  expect(await query(`SELECT id FROM "Experience" WHERE title = $1`, [`${chosen} (edited)`])).toHaveLength(0);

  await page.getByRole("button", { name: "Save draft" }).click();
  await page.waitForURL(/\/host\/events\?status=DRAFT/);
  const rows = await query<{ status: string; cuisine: string }>(`SELECT status, cuisine FROM "Experience" WHERE title = $1`, [`${chosen} (edited)`]);
  expect(rows).toHaveLength(1);
  expect(rows[0].status).toBe("DRAFT");
});
