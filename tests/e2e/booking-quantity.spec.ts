import { expect, signInAs, test } from "./helpers";

const money = (s: string) => Number(s.replace(/[^0-9.]/g, ""));

test("booking card: seat stepper, live total, Reserve N seats, carried into checkout and confirmation, inventory reduced", async ({ page }) => {
  await signInAs(page, /Zoe .*demo guest/);
  await page.goto("/discover?category=classes&spots=3&sort=soonest");
  await page.locator("article a").first().click();
  await page.waitForURL(/\/experiences\/[^/?]+(\?|$)/);
  const eventUrl = page.url();
  const selectedDate = () => page.getByLabel("Book this experience").locator("label").filter({ has: page.locator("input:checked") });

  const card = page.getByTestId("seat-quantity");
  await expect(card).toBeVisible();
  const minus = page.getByRole("button", { name: "Remove a guest" });
  const plus = page.getByRole("button", { name: "Add a guest" });

  // Default 1, minus disabled at the minimum.
  await expect(page.getByTestId("seat-count")).toHaveText("1");
  await expect(minus).toBeDisabled();
  const perSeat = money(await page.getByTestId("card-total").innerText());
  await expect(page.getByRole("link", { name: "Reserve 1 seat", exact: true })).toBeVisible();

  // +1 → 2 guests, total doubles, label updates.
  await plus.click();
  await expect(page.getByTestId("seat-count")).toHaveText("2");
  expect(money(await page.getByTestId("card-total").innerText())).toBe(perSeat * 2);
  await expect(minus).toBeEnabled();

  // Read the seats left before booking.
  const seatsText = await selectedDate().innerText();
  const before = Number(seatsText.match(/(\d+) spots? left/)![1]);

  await page.getByRole("link", { name: "Reserve 2 seats", exact: true }).click();
  await expect(page).toHaveURL(/seats=2/);
  await expect(page.getByLabel("Order summary")).toContainText("2 ×");

  await page.getByRole("checkbox", { name: /simulated payment/ }).check();
  await page.getByRole("checkbox", { name: /cancellation policy/ }).check();
  await page.getByRole("button", { name: /Confirm demo booking/ }).click();
  await page.waitForURL(/\/bookings\/TBL-.*confirmed=1/);
  await expect(page.getByText(/for 2 seats is confirmed/)).toBeVisible();

  // Back on the event: two fewer seats on that date.
  await page.goto(eventUrl);
  const after = Number((await selectedDate().innerText()).match(/(\d+) spots? left/)?.[1] ?? 0);
  expect(after).toBe(before - 2);
});

test("booking card: Regina's Table shows a fixed quantity of 2 and a $0 total", async ({ page }) => {
  await signInAs(page, /Jordan/);
  await page.goto("/experiences/reginas-table-supper-club");
  const card = page.getByTestId("seat-quantity");
  if (!(await card.isVisible())) test.skip(true, "This persona already has a reservation or the event is full.");
  await expect(page.getByTestId("seat-count")).toHaveText("2");
  await expect(page.getByRole("button", { name: "Remove a guest" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Add a guest" })).toBeDisabled();
  await expect(page.getByTestId("card-total")).toHaveText("$0");
  await expect(card).toContainText("exactly 2 guests");
});
