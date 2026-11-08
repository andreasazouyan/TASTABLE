import { expect, test, signInAs } from "./helpers";

const TABS: [string, string, string][] = [
  ["Home", "/", "Discover experiences worth sharing."],
  ["Discover", "/discover", "Discover"],
  ["Calendar", "/calendar", "Calendar"],
  ["Saved", "/saved", "Saved"],
  ["My Bookings", "/bookings", "My Bookings"],
];

test("guest navigation: Home, Discover, Calendar, Saved, My Bookings, each opening its page and highlighted when active", async ({ page }) => {
  await signInAs(page, /Zoe/);
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Primary" }).first();
  await expect(nav.getByRole("link")).toHaveText(TABS.map(([label]) => label));

  for (const [label, path, heading] of TABS) {
    await nav.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL((u) => u.pathname === path);
    await expect(page.getByRole("heading", { level: 1 }).first()).toContainText(heading);
    await expect(nav.locator("[aria-current=page]")).toHaveText(label);
  }

  // Profile sits apart at the top right, behind the avatar dropdown.
  await page.getByRole("button", { name: /Account menu/ }).click();
  await page.getByRole("menuitem", { name: "My Profile" }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(nav.locator("[aria-current=page]")).toHaveCount(0);
});

test("guest header: notifications bell opens in-app reminders", async ({ page }) => {
  await signInAs(page, /Zoe/);
  await page.goto("/discover");
  await page.getByRole("button", { name: /^Notifications/ }).click();
  const panel = page.getByRole("dialog", { name: "Notifications" });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText("In-app only");
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
});
