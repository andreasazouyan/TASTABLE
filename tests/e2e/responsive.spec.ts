import { expect, test, expectNoHorizontalScroll, signInAs } from "./helpers";

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "desktop", width: 1440, height: 900 },
];
const GUEST = ["/", "/discover", "/discover?category=social", "/calendar", "/bookings", "/saved", "/profile", "/about"];
const HOST = ["/host", "/host/events", "/host/events/new", "/host/reservations", "/host/finances", "/host/trends", "/host/profile", "/host/venue-request"];

for (const vp of VIEWPORTS) {
  test(`${vp.name}: pages render with a heading and no horizontal scroll`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await signInAs(page, /Jordan .*demo guest/);
    for (const path of GUEST) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(200);
      await expect(page.getByRole("heading", { level: 1 }).first(), path).toBeVisible();
      await expectNoHorizontalScroll(page);
    }
    await signInAs(page, "Maya Chen");
    for (const path of HOST) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(200);
      await expect(page.getByRole("heading", { level: 1 }).first(), path).toBeVisible();
      await expectNoHorizontalScroll(page);
    }
  });
}

test("keyboard: skip link and focusable navigation", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: /Skip to content/i });
  await expect(skip).toBeFocused();
  await skip.press("Enter");
  await expect(page).toHaveURL(/#main/);
});

test("form controls have accessible names", async ({ page }) => {
  await signInAs(page, "Maya Chen");
  for (const path of ["/host/events/new", "/host/finances", "/host/venue-request", "/discover"]) {
    await page.goto(path);
    const unlabeled = await page.evaluate(() =>
      Array.from(document.querySelectorAll("input:not([type=hidden]), select, textarea"))
        .filter((el) => {
          const e = el as HTMLInputElement;
          if (e.closest("[aria-hidden=true]")) return false;
          const id = e.id && document.querySelector(`label[for="${e.id}"]`);
          return !(id || e.closest("label") || e.getAttribute("aria-label") || e.getAttribute("aria-labelledby"));
        })
        .map((el) => (el as HTMLInputElement).name || el.outerHTML.slice(0, 80)),
    );
    expect(unlabeled, path).toEqual([]);
  }
});
