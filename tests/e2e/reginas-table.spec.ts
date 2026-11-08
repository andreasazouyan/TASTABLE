import { expect, signInAs, test } from "./helpers";

const DETAIL = "/experiences/reginas-table-supper-club";

test("Tastable Team's Entrepreneurship Class Supper: on Nov 23 in Discover, reserve 1–2 seats with mains, 6 → 4 seats, bookings, calendar and reset", async ({ page }) => {
  await signInAs(page, /Zoe .*demo guest/);

  // Discover on Nov 23, with the Manhattan + Morningside Heights + Supper Club filters.
  await page.goto("/discover?date=2026-11-23&borough=manhattan&neighborhood=morningside-heights&category=supper-clubs");
  const card = page.locator("article", { hasText: "Tastable Team's Entrepreneurship Class Supper" });
  await expect(card).toHaveCount(1);
  await expect(card).toContainText("6 seats left");
  await expect(card).toContainText("Mon, Nov 23, 8:30 PM");
  await expect(card).toContainText("$0");
  await expect(card).toContainText("Hosted by Tastable Team");

  // Detail page: host, price, duration, venue, menu, schedule, seats.
  await page.goto(DETAIL);
  await page.getByRole("button", { name: "Reset demo event" }).click();
  await expect(page.getByText(/Demo event reset/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Tastable Team's Entrepreneurship Class Supper" })).toBeVisible();
  await expect(page.getByTestId("hosted-by")).toHaveText("Hosted by the Tastable Team");
  await expect(page.getByTestId("price-note")).toHaveText("Complimentary experience — Special Tastable Demo Event");
  await expect(page.getByText("2 hr 30 min").first()).toBeVisible();
  await expect(page.getByText("500 Riverside Drive, Manhattan, NY 10027")).toBeVisible();
  await expect(page.getByText(/Regina and the Tastable team are excited to invite you/)).toBeVisible();
  await expect(page.getByText("Only 3 spots available — and you can bring a +1!")).toBeVisible();
  for (const t of ["Fresh green salad", "Pasta with meat sauce", "Vegetarian pesto pasta", "Chocolate cake", "Welcome drinks and mingling", "Three-course dinner", "Socializing and conversation"]) {
    await expect(page.getByText(t, { exact: true }).first()).toBeVisible();
  }
  await expect(page.locator("aside").getByText("6 seats left")).toBeVisible();

  await expect(page.getByText("Reservations are for 2")).toHaveCount(0);

  // Reserve 2 seats (you and a +1) with a main each: the standard [−] N [+] selector, 1 to 2.
  await page.getByRole("link", { name: /Reserve/ }).first().click();
  await expect(page.getByTestId("seat-count")).toHaveText("1");
  await expect(page.getByRole("button", { name: "Remove a seat" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Reserve 1 seat — Free" })).toBeVisible();
  const plus = page.getByRole("button", { name: "Add a seat" });
  await plus.click();
  await expect(page.getByTestId("seat-count")).toHaveText("2");
  await expect(plus).toBeDisabled();
  await expect(page.getByRole("button", { name: "Reserve 2 seats — Free" })).toBeVisible();
  await page.getByLabel("Guest 2 name (optional)").fill("Sam Lee");
  await page.locator("input[name=main0][value=PESTO]").check();
  await page.locator("input[name=main1][value=MEAT_SAUCE]").check();
  await expect(page.getByTestId("summary-guests")).toHaveText("2 guests");
  await expect(page.getByTestId("regina-summary")).toContainText("Vegetarian pesto pasta");
  await expect(page.getByTestId("checkout-total")).toHaveText("$0.00");
  await page.getByRole("button", { name: "Reserve 2 seats — Free" }).dblclick();
  await page.waitForURL(/\/bookings\/TBL-/);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("You're on the guest list!");
  await expect(dialog).toContainText("Zoe Park: Vegetarian pesto pasta · Sam Lee: Pasta with meat sauce");
  await dialog.getByRole("button", { name: /View My Ticket/ }).click();
  await expect(page.getByTestId("meal-choice")).toHaveText(["Vegetarian pesto pasta", "Pasta with meat sauce"]);

  // Bookings and calendar.
  await page.goto("/bookings");
  await expect(page.getByText("Tastable Team's Entrepreneurship Class Supper")).toHaveCount(1);
  await page.goto("/calendar?date=2026-11-23");
  await expect(page.getByText(/Entrepreneurship Class Supper/).first()).toBeVisible();

  // 6 → 4 seats, and the guest can't book twice.
  await page.goto("/discover?date=2026-11-23");
  await expect(page.locator("article", { hasText: "Tastable Team's Entrepreneurship" })).toContainText("4 seats left");
  await page.goto(DETAIL);
  await expect(page.getByText("You're on the guest list.")).toBeVisible();

  // Developer reset: back to 6, demo reservation cleared.
  await page.getByRole("button", { name: "Reset demo event" }).click();
  await expect(page.getByText(/1 demo reservation cleared, 6 seats available/)).toBeVisible();
  await page.goto("/discover?date=2026-11-23");
  await expect(page.locator("article", { hasText: "Tastable Team's Entrepreneurship" })).toContainText("6 seats left");
});
