import { expect, signInAs, test } from "./helpers";

const DETAIL = "/experiences/reginas-table-supper-club";

test("Regina's Table: on Nov 19 in Discover, reserve for 2 with mains, 6 → 4 seats, bookings, calendar and reset", async ({ page }) => {
  await signInAs(page, /Zoe .*demo guest/);

  // Discover on Nov 19, with the Manhattan + Morningside Heights + Supper Club filters.
  await page.goto("/discover?date=2026-11-19&borough=manhattan&neighborhood=morningside-heights&category=supper-clubs");
  const card = page.locator("article", { hasText: "Regina's Table: An Intimate Supper Club" });
  await expect(card).toHaveCount(1);
  await expect(card).toContainText("6 seats left");
  await expect(card).toContainText("Thu, Nov 19, 8:30 PM");
  await expect(card).toContainText("$0");

  // Detail page: host, price, duration, venue, menu, schedule, seats.
  await page.goto(DETAIL);
  await page.getByRole("button", { name: "Reset demo event" }).click();
  await expect(page.getByText(/Demo event reset/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Regina's Table: An Intimate Supper Club" })).toBeVisible();
  await expect(page.getByTestId("price-note")).toHaveText("Complimentary experience — Special Tastable Demo Event");
  await expect(page.getByText("2 hr 30 min").first()).toBeVisible();
  await expect(page.getByText("500 Riverside Drive, Manhattan, NY 10027")).toBeVisible();
  for (const t of ["Fresh green salad", "Pasta with meat sauce", "Vegetarian pesto pasta", "Chocolate cake", "Welcome drinks and mingling", "Three-course dinner", "Socializing and conversation"]) {
    await expect(page.getByText(t, { exact: true }).first()).toBeVisible();
  }
  await expect(page.locator("aside").getByText("6 seats left")).toBeVisible();

  // Reserve for 2 with a main each.
  await page.getByRole("link", { name: "Reserve for 2 — Free" }).click();
  await page.getByLabel("Your +1's name (optional)").fill("Sam Lee");
  await page.locator("input[name=mainGuest][value=PESTO]").check();
  await page.locator("input[name=mainPlusOne][value=MEAT_SAUCE]").check();
  await expect(page.getByTestId("regina-summary")).toContainText("Vegetarian pesto pasta");
  await expect(page.getByTestId("checkout-total")).toHaveText("$0.00");
  await page.getByRole("button", { name: "Reserve for 2 — Free" }).dblclick();
  await page.waitForURL(/\/bookings\/TBL-/);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("You're on the guest list!");
  await expect(dialog).toContainText("Zoe Park: Vegetarian pesto pasta · Sam Lee: Pasta with meat sauce");
  await dialog.getByRole("button", { name: /View My Ticket/ }).click();
  await expect(page.getByTestId("meal-choice")).toHaveText(["Vegetarian pesto pasta", "Pasta with meat sauce"]);

  // Bookings and calendar.
  await page.goto("/bookings");
  await expect(page.getByText("Regina's Table: An Intimate Supper Club")).toHaveCount(1);
  await page.goto("/calendar?date=2026-11-19");
  await expect(page.getByText(/Regina/).first()).toBeVisible();

  // 6 → 4 seats, and the guest can't book twice.
  await page.goto("/discover?date=2026-11-19");
  await expect(page.locator("article", { hasText: "Regina's Table" })).toContainText("4 seats left");
  await page.goto(DETAIL);
  await expect(page.getByText("You're on the guest list.")).toBeVisible();

  // Developer reset: back to 6, demo reservation cleared.
  await page.getByRole("button", { name: "Reset demo event" }).click();
  await expect(page.getByText(/1 demo reservation cleared, 6 seats available/)).toBeVisible();
  await page.goto("/discover?date=2026-11-19");
  await expect(page.locator("article", { hasText: "Regina's Table" })).toContainText("6 seats left");
});
