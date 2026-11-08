import { expect, test, signInAs } from "./helpers";

test("profile: edit neighborhood, time slots, cuisine and dish; changes persist and drive recommendations", async ({ page }) => {
  await signInAs(page, /Jordan .*demo guest/);
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Jordan Lee", level: 1 })).toBeVisible();
  await expect(page.getByText("jordan.guest@example.com")).toBeVisible();
  for (const h of ["My Preferences", "My Bookings", "Saved Experiences", "My Reviews"]) await expect(page.getByRole("heading", { name: h, level: 2 })).toBeVisible();

  // Current answers are loaded.
  await expect(page.getByText("Selected: Williamsburg")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /6:00–8:00 PM/ })).toBeChecked();
  await expect(page.getByRole("button", { name: "Remove Pasta" })).toBeVisible();
  const save = page.getByRole("button", { name: "Save Changes" });
  await expect(save).toBeDisabled();

  // Change neighborhood, a time slot, a cuisine and a favorite dish.
  await page.getByText("East Village", { exact: true }).click();
  await page.getByRole("checkbox", { name: /6:00–8:00 PM/ }).uncheck({ force: true });
  await page.getByText("12:00–2:00 PM", { exact: true }).click();
  await page.getByText("Mexican", { exact: true }).click();
  await page.getByRole("button", { name: "Remove Pasta" }).click();
  await page.getByRole("button", { name: "Tacos" }).click();
  await expect(page.getByText("You have unsaved changes.")).toBeVisible();
  await save.click();
  await expect(page.getByText("Preferences saved. Your recommendations now use these answers.")).toBeVisible();

  // Persisted after refresh.
  await page.reload();
  await expect(page.getByText("Selected: East Village")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /12:00–2:00 PM/ })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: /6:00–8:00 PM/ })).not.toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Mexican" })).toBeChecked();
  await expect(page.getByRole("button", { name: "Remove Tacos" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove Pasta" })).toHaveCount(0);

  // Recommendations reflect the new cuisine and neighborhood.
  // Pasta is no longer a reason anywhere; the taco pop-up now explains itself with the new answers.
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Recommended for you" }).getByText(/^Why: /).first()).toBeVisible();
  await expect(page.getByText(/favorite dishes: Pasta/)).toHaveCount(0);
  await page.goto("/discover?sort=recommended");
  const taco = page.getByRole("article").filter({ has: page.getByRole("link", { name: "One-Night Taco Pop-Up" }) });
  await expect(taco.getByText(/Featuring one of your favorite dishes: Tacos/)).toBeVisible();

  // Bookings and saved experiences are untouched.
  await page.goto("/profile");
  await expect(page.getByText(/All bookings \(\d+\)/)).toBeVisible();
  await expect(page.getByText("All saved (3)")).toBeVisible();
});

test("old preferences URL leads to My Preferences", async ({ page }) => {
  await signInAs(page, /Zoe .*demo guest/);
  await page.goto("/profile/preferences");
  await expect(page).toHaveURL(/\/profile/);
  await expect(page.getByRole("heading", { name: "My Preferences" })).toBeVisible();
});
