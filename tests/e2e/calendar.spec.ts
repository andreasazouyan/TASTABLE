import pg from "pg";

import { expect, signInAs, test } from "./helpers";

const DB = process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/tastable_e2e";
async function nyDateOfBooking(reference: string) {
  const client = new pg.Client({ connectionString: DB });
  await client.connect();
  try {
    const { rows } = await client.query<{ d: string }>(
      `SELECT to_char((s."startsAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/New_York', 'YYYY-MM-DD') d FROM "Booking" b JOIN "ExperienceSession" s ON s.id = b."sessionId" WHERE b.reference = $1`,
      [reference],
    );
    return rows[0].d;
  } finally {
    await client.end();
  }
}

test("Discover → book → confirmation → calendar updated → open ticket; cancelling shows as cancelled", async ({ page }) => {
  await signInAs(page, /Zoe .*demo guest/);
  await page.goto("/discover?category=classes&spots=2&sort=price-asc");
  const first = page.getByRole("list", { name: "Results" }).getByRole("article").first();
  const title = (await first.getByRole("heading", { level: 3 }).innerText()).trim();
  await first.getByRole("link", { name: title }).click();
  await page.getByRole("link", { name: "Book now" }).first().click();
  await page.getByRole("button", { name: "Add a ticket", exact: true }).click();
  await page.getByRole("checkbox", { name: /simulated payment/ }).check();
  await page.getByRole("checkbox", { name: /cancellation policy/ }).check();
  await page.getByRole("button", { name: /Confirm demo booking/ }).click();
  await page.waitForURL(/\/bookings\/TBL-.*confirmed=1/);
  const reference = page.url().match(/TBL-[A-Z0-9-]+/)![0];
  const day = await nyDateOfBooking(reference);

  // The calendar shows it on the session's New York date, prominently, with the details.
  await page.goto(`/calendar?view=month&date=${day}`);
  const cell = page.getByRole("gridcell").filter({ has: page.getByRole("link", { name: new RegExp(`^Select .*${Number(day.slice(8))}, ${day.slice(0, 4)}.*booked`) }) });
  await expect(cell.getByRole("link", { name: new RegExp(`Booked: .*${title}`) })).toBeVisible();
  await cell.getByRole("link", { name: /^Select / }).click();
  await page.waitForURL(new RegExp(`day=${day}`));
  const panel = page.getByRole("region", { name: /, (January|February|March|April|May|June|July|August|September|October|November|December) \d+/ });
  const plan = panel.getByRole("listitem").filter({ hasText: title });
  await expect(plan.getByText("Confirmed", { exact: true })).toBeVisible();
  await expect(plan.getByText("2 tickets")).toBeVisible();
  await expect(panel.getByRole("link", { name: "Explore experiences on this day" })).toHaveAttribute("href", `/discover?date=${day}`);

  // Clicking the event opens the booking and its digital ticket.
  await plan.getByRole("link", { name: /View booking & ticket/ }).click();
  await page.waitForURL(new RegExp(`/bookings/${reference}`));
  await expect(page.getByRole("img", { name: /QR code for ticket TKT-/ }).first()).toBeVisible();

  // Cancel: the calendar no longer shows it as an active booking.
  await page.getByRole("button", { name: /Cancel booking/ }).click();
  await page.getByRole("checkbox", { name: /I understand the fee is/ }).check();
  await page.getByRole("button", { name: /Confirm cancellation/ }).click();
  await expect(page.getByRole("status").filter({ hasText: /cancelled/i }).first()).toBeVisible();
  await page.goto(`/calendar?view=week&date=${day}&day=${day}`);
  const after = page.getByRole("region", { name: /, (January|February|March|April|May|June|July|August|September|October|November|December) \d+/ }).getByRole("listitem").filter({ hasText: title });
  await expect(after.getByText("Cancelled", { exact: true })).toBeVisible();
  await expect(after.getByText("Confirmed", { exact: true })).toHaveCount(0);
});

test("select an empty date → Discover opens filtered to that date; works across month and year", async ({ page }) => {
  await signInAs(page, /Alex .*demo guest/, "/calendar");
  // Week view across the year boundary, then pick New Year's Eve.
  await page.goto("/calendar?view=week&date=2026-12-30");
  await expect(page.getByRole("heading", { name: /Dec 27 – Jan 2, 2027/ })).toBeVisible();
  await page.getByRole("link", { name: /^Select Thursday, December 31, 2026/ }).click();
  await page.waitForURL(/day=2026-12-31/);
  const panel = page.getByRole("region", { name: "Thursday, December 31" });
  await expect(panel.getByText("No experiences planned yet.")).toBeVisible();

  // Month navigation keeps working into the next year.
  await page.getByRole("link", { name: "Next week" }).click();
  await expect(page.getByRole("heading", { name: /Jan 3 – Jan 9, 2027/ })).toBeVisible();

  // An empty upcoming day in view → Discover for that day, other filters still available.
  await page.goto("/calendar?view=month&date=2026-11-01&day=2026-11-05");
  await page.getByRole("region", { name: "Thursday, November 5" }).getByRole("link", { name: /experiences .*this day/ }).click();
  await page.waitForURL(/\/discover\?date=2026-11-05/);
  await expect(page.getByRole("complementary", { name: "Filters" }).getByRole("radio", { name: "Choose Dates" })).toBeChecked();
  const cards = await page.getByRole("list", { name: "Results" }).getByRole("article").allInnerTexts();
  expect(cards.length).toBeGreaterThan(0);
  for (const c of cards) expect(c).toMatch(/Thu, Nov 5/);
  await page.getByRole("complementary", { name: "Filters" }).getByLabel("Cooking Classes & Workshops").check();
  await page.waitForURL(/category=classes/);
  await expect(page).toHaveURL(/from=2026-11-05/);
});
