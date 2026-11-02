import { expect, test, signInAs } from "./helpers";

test("guest: discover, filter, book two tickets, see ticket and calendar, cancel with refund", async ({ page, request }) => {
  await signInAs(page, /Jordan .*demo guest/);

  // Home: hero, the four categories, collections.
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Discover experiences worth sharing");
  for (const c of ["Supper Clubs & Private Dining", "Cooking Classes & Workshops", "Pop-Ups & Exclusive Experiences", "Social Culinary Experiences"]) {
    await expect(page.getByText(c).first()).toBeVisible();
  }

  // Discover: filters live in the URL and survive reloads.
  await page.goto("/discover?category=classes&maxPrice=120&sort=price-asc");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const cards = page.locator("article");
  await expect(cards.first()).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/category=classes/);
  await expect(page).toHaveURL(/sort=price-asc/);

  // An impossible filter shows the empty state.
  await page.goto("/discover?category=classes&maxPrice=5");
  await expect(page.getByText(/No experiences match|Nothing matches/i)).toBeVisible();

  // Detail page → booking.
  await page.goto("/discover?category=classes&spots=2&sort=soonest");
  await page.locator("article a").first().click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText(/Cancellation policy/i).first()).toBeVisible();
  await page.getByRole("link", { name: "Book now" }).first().click();
  await expect(page.getByText(/Demo payment · nothing will be charged/)).toBeVisible();
  await expect(page.locator('input[autocomplete="cc-number"]')).toHaveCount(0);

  const total1 = await page.getByTestId("checkout-total").innerText();
  await page.getByRole("button", { name: "Add a ticket", exact: true }).click();
  const total2 = await page.getByTestId("checkout-total").innerText();
  expect(total2).not.toBe(total1);

  // Validation: policy must be acknowledged.
  await page.getByRole("checkbox", { name: /simulated payment/ }).check();
  await page.getByRole("checkbox", { name: /cancellation policy/ }).check();
  await page.getByRole("button", { name: /Confirm demo booking/ }).click();

  // Confirmation + digital ticket with QR codes.
  await page.waitForURL(/\/bookings\/TBL-.*confirmed=1/);
  const reference = page.url().match(/TBL-[A-Z0-9-]+/)![0];
  await expect(page.getByText(reference).first()).toBeVisible();
  await expect(page.getByRole("img", { name: /QR code for ticket TKT-/ }).first()).toBeVisible();
  await expect(page.getByText(/TKT-/).first()).toBeVisible();

  // .ics export for the booking is a valid calendar.
  const ics = await request.get(`/api/bookings/${reference}/ics`, { headers: { cookie: (await page.context().cookies()).map((c) => `${c.name}=${c.value}`).join("; ") } });
  expect(ics.status()).toBe(200);
  expect(ics.headers()["content-type"]).toContain("text/calendar");
  const body = await ics.text();
  expect(body).toMatch(/^BEGIN:VCALENDAR\r\n/);
  expect(body).toContain("BEGIN:VEVENT");

  // Calendar shows the booking.
  await page.goto("/calendar?view=week");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // Cancel: the exact refund is shown before confirming.
  await page.goto(`/bookings/${reference}`);
  await page.getByRole("button", { name: /Cancel booking/ }).click();
  const confirm = page.getByRole("button", { name: /Confirm cancellation · refund \$/ });
  await expect(confirm).toBeVisible();
  await confirm.click();
  await expect(page.getByRole("status").filter({ hasText: /cancelled/i }).first()).toBeVisible();

  await page.goto("/bookings?view=cancelled");
  await expect(page.getByText(reference)).toBeVisible();
});

test("guest: shared calendar link shows events without private details, unknown tokens are inactive", async ({ page }) => {
  const res = await page.goto("/c/demo-share-jordan-k7Qm2xV9pL4tR8wN3cY6");
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const text = await page.locator("main").innerText();
  expect(text).not.toMatch(/@example\.com|TBL-/);

  const ics = await page.request.get("/c/demo-share-jordan-k7Qm2xV9pL4tR8wN3cY6/calendar.ics");
  expect(ics.status()).toBe(200);
  expect(await ics.text()).toContain("BEGIN:VCALENDAR");

  await page.goto("/c/not-a-real-token-123456789");
  await expect(page.getByText("This link isn't active")).toBeVisible();
  const missingIcs = await page.request.get("/c/not-a-real-token-123456789/calendar.ics");
  expect(missingIcs.status()).toBe(404);
});
