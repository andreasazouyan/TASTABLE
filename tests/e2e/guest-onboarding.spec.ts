import { expect, test, signInAs } from "./helpers";

test("onboarding: six pages, back keeps selections, refresh resumes, saved answers are correct", async ({ page }) => {
  await signInAs(page, /Alex .*demo guest/);
  await page.goto("/onboarding");
  await expect(page.getByText("Step 1 of 6")).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Onboarding progress" })).toHaveAttribute("aria-valuenow", "1");

  // Page 1: neighborhood (searchable) + travel time. Continue is blocked until both are chosen.
  await expect(page.getByRole("heading", { name: "Where are you based?" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Choose your neighborhood.")).toBeVisible();
  await page.getByRole("searchbox", { name: "Search neighborhoods" }).fill("green");
  await expect(page.getByText("West Village", { exact: true })).toBeHidden();
  await page.getByText("Greenwich Village", { exact: true }).click();
  await page.getByText("30 minutes", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Page 2: days and time slots (multi-select).
  await expect(page.getByRole("heading", { name: "When do you love going out?" })).toBeVisible();
  await page.getByText("Friday", { exact: true }).click();
  await page.getByText("Saturday", { exact: true }).click();
  await page.getByText("6:00–8:00 PM", { exact: true }).click();
  await page.getByText("10:00 PM–12:00 AM", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Page 3: social preference.
  await expect(page.getByRole("heading", { name: "Who would you love to share an experience with?" })).toBeVisible();
  await page.getByText("With a friend or partner", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Page 4: up to three categories; the fourth is disabled.
  await expect(page.getByText("0 of 3 selected")).toBeVisible();
  await page.getByText("Supper Clubs & Private Dining", { exact: true }).click();
  await page.getByText("Cooking Classes & Workshops", { exact: true }).click();
  await page.getByText("Social Culinary Experiences", { exact: true }).click();
  await expect(page.getByText(/3 of 3 selected/)).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /Pop-Ups & Exclusive Experiences/ })).toBeDisabled();
  await page.getByRole("button", { name: "Continue" }).click();

  // Page 5: cuisines. Then go back: page 4 keeps its selections.
  await expect(page.getByRole("heading", { name: "Which cuisines do you love?" })).toBeVisible();
  await page.getByText("Italian", { exact: true }).click();
  await page.getByText("Thai", { exact: true }).click();
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByText(/3 of 3 selected/)).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /Cooking Classes & Workshops/ })).toBeChecked();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("checkbox", { name: "Italian" })).toBeChecked();
  await page.getByRole("button", { name: "Continue" }).click();

  // Refresh on page 6: same page, earlier answers still there.
  await expect(page.getByRole("heading", { name: "Anything you're craving?" })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Step 6 of 6")).toBeVisible();
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByRole("checkbox", { name: "Thai" })).toBeChecked();
  await page.getByRole("button", { name: "Continue" }).click();

  // Page 6: suggestions, search and a custom dish (normalized).
  await page.getByRole("button", { name: "Pizza" }).click();
  const search = page.getByRole("searchbox", { name: "Search or add a dish" });
  await search.fill("gelato");
  await page.getByRole("button", { name: "Ice cream" }).click();
  await search.fill("Grandma's pierogi");
  await search.press("Enter");
  await expect(page.getByRole("button", { name: "Remove Grandma's pierogi" })).toBeVisible();
  await page.getByRole("button", { name: "Finish" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/onboarding"));

  // Saved answers come back exactly when revisiting.
  await page.goto("/onboarding?step=1");
  await expect(page.getByText("Selected: Greenwich Village")).toBeVisible();
  await expect(page.getByRole("radio", { name: "30 minutes" })).toBeChecked();
  await page.goto("/onboarding?step=2");
  await expect(page.getByRole("checkbox", { name: "Friday" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Saturday" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Monday" })).not.toBeChecked();
  await expect(page.getByRole("checkbox", { name: /6:00–8:00 PM/ })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: /10:00 PM–12:00 AM/ })).toBeChecked();
  await page.goto("/onboarding?step=3");
  await expect(page.getByRole("radio", { name: /With a friend or partner/ })).toBeChecked();
  await page.goto("/onboarding?step=6");
  for (const d of ["Pizza", "Ice cream", "Grandma's pierogi"]) await expect(page.getByRole("button", { name: `Remove ${d}` })).toBeVisible();

  // Recommendations use the saved preferences.
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Recommended for you" }).getByText(/^Why: /).first()).toBeVisible();
});

test("onboarding can be skipped, and onboarded guests aren't sent through it again", async ({ page }) => {
  await signInAs(page, /Jordan .*demo guest/);
  await expect(page).not.toHaveURL(/onboarding/);
  await page.goto("/onboarding");
  await page.getByRole("button", { name: "Skip for now" }).click();
  await page.waitForURL(/\/discover/);
});
