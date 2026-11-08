import { expect, test } from "./helpers";

const stamp = Date.now();

test("guest sign-up: create account, onboarding, sign out, log back in", async ({ page }) => {
  const email = `maya.${stamp}@gmail.com`;
  await page.goto("/");
  await page.getByRole("link", { name: "Sign up" }).click();
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();

  // Validation: short password.
  await page.getByLabel("Your name").fill("Maya Chen");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Use at least 8 characters.")).toBeVisible();

  await page.getByLabel("Password").fill("tastable-pass-1");
  await page.getByRole("button", { name: "Create account" }).click();

  // New guests land in the six-page onboarding.
  await page.waitForURL(/\/onboarding/);
  await expect(page.getByText("Step 1 of 6")).toBeVisible();
  await expect(page.getByText("Welcome, host.")).toBeHidden();
  await page.getByRole("button", { name: "Skip for now" }).click();
  await page.waitForURL(/\/discover/);

  // The account shows on the profile.
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Maya Chen" })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL((u) => u.pathname === "/");

  // Same email can't sign up twice.
  await page.goto("/sign-up");
  await page.getByLabel("Your name").fill("Someone Else");
  await page.getByLabel("Email").fill(email.toUpperCase());
  await page.getByLabel("Password").fill("another-pass-2");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("An account with this email already exists. Log in instead.")).toBeVisible();

  // Wrong password, then the right one.
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("That email and password don't match an account.")).toBeVisible();
  await page.getByLabel("Password").fill("tastable-pass-1");
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL((u) => u.pathname === "/");
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Maya Chen" })).toBeVisible();
});

test("host sign-up: taste onboarding first, then host profile setup", async ({ page }) => {
  await page.goto("/sign-up");
  await page.getByText("I want to host", { exact: true }).click();
  await page.getByLabel("Your name").fill("Rafael Ortiz");
  await page.getByLabel("Email").fill(`rafael.${stamp}@gmail.com`);
  await page.getByLabel("Password").fill("tastable-pass-2");
  await page.getByRole("button", { name: "Create account" }).click();

  await page.waitForURL(/\/onboarding/);
  await expect(page.getByText("Welcome, host.")).toBeVisible();
  await expect(page.getByText("Step 1 of 6")).toBeVisible();
  await page.getByRole("button", { name: "Skip for now" }).click();

  await page.waitForURL(/\/host\/onboarding/);
  await expect(page.getByLabel("Host name")).toHaveValue("Rafael Ortiz");
  await page.getByText("Private chef", { exact: true }).click();
  await page.getByLabel("Tagline").fill("Oaxacan suppers in a Bushwick loft");
  await page.getByLabel("Bio").fill("Rafael cooks the moles he grew up with for twelve guests at a time.");
  await page.getByLabel("Culinary background").fill("Line cook for eight years");
  await page.getByText("Mexican", { exact: true }).first().click();
  await page.getByLabel("Location").selectOption("williamsburg");
  await page.getByRole("button", { name: "Create host profile" }).click();
  await page.waitForURL(/\/host\?welcome=1/);
  await expect(page.getByRole("heading", { name: "Welcome to hosting on Tastable" })).toBeVisible();
});

test("demo personas are still one click away on the log-in page", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { name: "Explore with a demo persona" })).toBeVisible();
  await page.getByRole("button", { name: /Zoe .*demo guest/ }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/sign-in"));
});
