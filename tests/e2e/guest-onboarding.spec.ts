import { expect, test, signInAs } from "./helpers";

test("onboarding: five skippable steps, saved preferences, explained recommendations, editable", async ({ page }) => {
  await signInAs(page, /Alex .*demo guest/);
  await page.goto("/onboarding");
  await expect(page.getByText("Step 1 of 5")).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Onboarding progress" })).toHaveAttribute("aria-valuenow", "1");

  await page.getByRole("button", { name: "Continue" }).click(); // location (default NYC)
  await page.getByRole("button", { name: "Skip step" }).click(); // radius
  await expect(page.getByText("Step 3 of 5")).toBeVisible();
  await page.getByText("Japanese", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("Cooking Classes & Workshops").first().click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("Learn New Skills").click();
  await page.getByRole("button", { name: "Finish and see recommendations" }).click();

  await page.waitForURL((u) => !u.pathname.startsWith("/onboarding"));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Picked for you, Alex" })).toBeVisible();
  await expect(page.getByText("Recommended for you").first()).toBeVisible();
  await expect(page.getByText(/you want to learn new skills|a cuisine you love|In a category you chose/).first()).toBeVisible();

  await page.goto("/profile/preferences");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
