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
  await page.getByRole("link", { name: /^Reserve \d+ seats?$/ }).first().click();
  await page.getByRole("button", { name: "Add a ticket", exact: true }).click();
  await page.getByRole("checkbox", { name: /simulated payment/ }).check();
  await page.getByRole("checkbox", { name: /cancellation policy/ }).check();
  await page.getByRole("button", { name: /Confirm demo booking/ }).click();
  await page.waitForURL(/\/bookings\/TBL-.*confirmed=1/);
  const reference = page.url().match(/TBL-[A-Z0-9-]+/)![0];
  const day = await nyDateOfBooking(reference);

  // The calendar shows it on the session's New York date, prominently, with the details.
  await page.goto(`/calendar?view=month&date=${day}`);
  const cell = page.getByRole("gridcell").filter({ has: page.getByRole("link", { name: new RegExp(`^Discover .*${Number(day.slice(8))}, ${day.slice(0, 4)}: .*experiences?.*you're booked`) }) });
  await expect(cell.getByRole("link", { name: new RegExp(`Booked: .*${title}`) })).toBeVisible();
  // The day panel (today, or ?day=) lists the plans with their details.
  await page.goto(`/calendar?view=month&date=${day}&day=${day}`);
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

test("every date opens Discover filtered to that day, with counts that match; works across month and year", async ({ page }) => {
  await signInAs(page, /Alex .*demo guest/, "/calendar");
  // Week view across the year boundary: New Year's Eve is a link into Discover for that date.
  await page.goto("/calendar?view=week&date=2026-12-30");
  await expect(page.getByRole("heading", { name: /Dec 27 – Jan 2, 2027/ })).toBeVisible();
  await page.getByRole("link", { name: /^Discover Thursday, December 31, 2026/ }).click();
  await page.waitForURL(/\/discover\?date=2026-12-31/);
  await expect(page.getByRole("list", { name: "Active filters" }).getByRole("link", { name: "Remove filter: Date: Thu, Dec 31" })).toBeVisible();

  // Navigation keeps working into the next year.
  await page.goto("/calendar?view=week&date=2026-12-30");
  await page.getByRole("link", { name: "Next week" }).click();
  await expect(page.getByRole("heading", { name: /Jan 3 – Jan 9, 2027/ })).toBeVisible();

  // Every day of the next two weeks has experiences, and the count on the calendar is what Discover shows.
  await page.goto("/calendar?view=month&date=2026-11-02");
  for (let d = 2; d <= 15; d++) {
    const link = page.getByRole("link", { name: new RegExp(`^Discover \\w+, November ${d}, 2026: (\\d+) experiences?`) });
    await expect(link).toHaveCount(1);
    const n = Number((await link.getAttribute("aria-label"))!.match(/: (\d+) experience/)![1]);
    expect(n, `November ${d}`).toBeGreaterThanOrEqual(3);
  }
  const label = (await page.getByRole("link", { name: /^Discover Tuesday, November 10, 2026/ }).getAttribute("aria-label"))!;
  const count = Number(label.match(/: (\d+) experience/)![1]);
  await page.getByRole("link", { name: /^Discover Tuesday, November 10, 2026/ }).click();
  await page.waitForURL(/\/discover\?date=2026-11-10/);
  await expect(page.getByRole("heading", { name: `${count} ${count === 1 ? "experience" : "experiences"} on Tuesday, November 10` })).toBeVisible();
  const cards = await page.getByRole("list", { name: "Results" }).getByRole("article").allInnerTexts();
  expect(cards).toHaveLength(count);
  for (const c of cards) expect(c).toMatch(/Tue, Nov 10/);

  // Other filters combine with the date and keep it; removing the date chip keeps the others.
  await expect(page.getByRole("button", { name: "Dates: Tue, Nov 10. Change dates" })).toBeVisible();
  await page.getByRole("complementary", { name: "Filters" }).getByLabel("Cooking Classes & Workshops").check();
  await page.waitForURL(/category=classes/);
  await expect(page).toHaveURL(/date=2026-11-10/);
  for (const c of await page.getByRole("list", { name: "Results" }).getByRole("article").allInnerTexts()) expect(c).toMatch(/Tue, Nov 10/);
  await page.getByRole("list", { name: "Active filters" }).getByRole("link", { name: /Remove filter: Date: Tue, Nov 10/ }).click();
  await page.waitForURL((u) => !u.search.includes("from=") && u.search.includes("category=classes"));

  // The day panel still offers Discover for today.
  await page.goto("/calendar?view=month&date=2026-11-01&day=2026-11-05");
  await page.getByRole("region", { name: "Thursday, November 5" }).getByRole("link", { name: /experiences .*this day/ }).click();
  await page.waitForURL(/\/discover\?date=2026-11-05/);
});
