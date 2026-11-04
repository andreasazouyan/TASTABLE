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

// The E2E clock is Monday 2026-11-02 12:00 New York. This sample session starts 23 hours later
// (Tuesday 11:00 AM), so a cancellation now is "late": $100 tickets make the fee easy to read.
const SESSION = "e2e_late_session";
const STARTS = "2026-11-03T16:00:00.000Z";

test.beforeAll(async () => {
  await query(
    `INSERT INTO "ExperienceSession" (id, "experienceId", "startsAt", "endsAt", capacity, "seatsReserved", "priceOverrideCents", status, "createdAt", "updatedAt")
     SELECT $1, id, $2::timestamptz, $2::timestamptz + interval '3 hours', 10, 0, 10000, 'SCHEDULED', now(), now() FROM "Experience" WHERE slug = 'italian-pasta-making-workshop'
     ON CONFLICT (id) DO UPDATE SET status = 'SCHEDULED'`,
    [SESSION, STARTS],
  );
});

// Later specs expect the seeded schedule, so take this extra session off Discover afterwards.
test.afterAll(async () => {
  await query(`UPDATE "ExperienceSession" SET status = 'CANCELLED' WHERE id = $1`, [SESSION]);
});

test("late-fee terms: checkout notice, You're booked!, in-app reminder, cancellation with the exact fee", async ({ page }) => {
  await signInAs(page, /Sofia .*demo guest/);
  await page.goto(`/experiences/italian-pasta-making-workshop/book?session=${SESSION}`);

  // Checkout states the policy and requires acknowledging it.
  const notice = page.getByTestId("late-fee-notice");
  await expect(notice.getByText("Cancellations made less than 24 hours before the event are subject to a fee of 25% of the ticket subtotal.", { exact: true })).toBeVisible();
  await expect(notice).toContainText("$25.00 (25% of the $100.00 ticket subtotal)");
  await page.getByRole("button", { name: "Add a ticket", exact: true }).click();
  await expect(notice).toContainText("$50.00 (25% of the $200.00 ticket subtotal)");
  await page.getByRole("checkbox", { name: /simulated payment/ }).check();
  await page.getByRole("button", { name: /Confirm demo booking/ }).click();
  await expect(page.getByText(/acknowledge|accept/i).first()).toBeVisible();
  await expect(page).toHaveURL(/\/book\?/);
  await page.getByRole("checkbox", { name: /cancellation policy/ }).check();
  await page.getByRole("button", { name: /Confirm demo booking/ }).click();
  await page.waitForURL(/\/bookings\/TBL-.*confirmed=1/);
  const reference = page.url().match(/TBL-[A-Z0-9-]+/)![0];

  // "You're booked!" with the event, date, time, tickets, total and the exact fee.
  const dialog = page.getByRole("dialog", { name: "You're booked!" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Italian Pasta-Making Workshop")).toBeVisible();
  await expect(dialog.getByText("Tuesday, November 3, 2026")).toBeVisible();
  await expect(dialog.getByText(/11:00 AM/)).toBeVisible();
  await expect(dialog.locator("dd").filter({ hasText: /^2$/ })).toBeVisible();
  await expect(dialog.getByText("Please note: Cancelling less than 24 hours before this event will incur a 25% cancellation fee.")).toBeVisible();
  await expect(dialog.getByText("For your $200.00 booking, the late cancellation fee would be $50.00.")).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Add to Calendar" })).toHaveAttribute("href", `/api/bookings/${reference}/ics`);
  await dialog.getByRole("button", { name: "View My Ticket" }).click();
  await expect(dialog).toBeHidden();

  // The .ics includes a 24-hour alarm.
  const ics = await page.request.get(`/api/bookings/${reference}/ics`);
  expect(await ics.text()).toContain("TRIGGER:-PT24H");

  // It starts within 24 hours, so the in-app reminder is showing (and says it's in-app only).
  const reminder = page.getByRole("list", { name: "Reminders" }).getByRole("listitem").filter({ hasText: "Italian Pasta-Making Workshop" });
  await expect(reminder).toContainText("starts tomorrow at 11:00 AM");
  await expect(reminder).toContainText("In-app reminder only");

  // Cancellation shows time left, fee %, fee and refund, and needs explicit confirmation.
  await page.getByRole("button", { name: /Cancel booking/ }).click();
  await expect(page.getByTestId("time-remaining")).toHaveText("23 hr");
  await expect(page.getByText("Cancellation fee (25%)")).toBeVisible();
  await expect(page.getByTestId("fee-amount")).toHaveText("$50.00");
  const [{ total }] = await query<{ total: number }>(`SELECT "totalPriceCents" total FROM "Booking" WHERE reference = $1`, [reference]);
  const refund = `$${((total - 5000) / 100).toFixed(2)}`;
  await expect(page.getByTestId("refund-amount")).toHaveText(refund);
  const confirm = page.getByRole("button", { name: `Confirm cancellation · refund ${refund}` });
  await expect(confirm).toBeDisabled();
  await page.getByRole("checkbox", { name: /I understand the fee is \$50\.00/ }).check();
  await confirm.click();
  await expect(page.getByRole("status").filter({ hasText: `A $50.00 cancellation fee was kept and ${refund} was refunded` })).toBeVisible();

  const [row] = await query<{ status: string; fee: number; refund: number; seats: number; reminder: string }>(
    `SELECT b.status, b."cancellationFeeCents" fee, b."refundAmountCents" refund, s."seatsReserved" seats, r.status reminder
     FROM "Booking" b JOIN "ExperienceSession" s ON s.id = b."sessionId" JOIN "BookingReminder" r ON r."bookingId" = b.id WHERE b.reference = $1`,
    [reference],
  );
  expect(row).toEqual({ status: "CANCELLED", fee: 5000, refund: total - 5000, seats: 0, reminder: "CANCELLED" });

  await page.reload();
  await expect(page.getByText("Cancellation fee (25%)")).toBeVisible();
  await expect(page.getByText("This ticket is no longer valid.").first()).toBeVisible();
  await expect(page.getByRole("list", { name: "Reminders" })).toHaveCount(0);
});
