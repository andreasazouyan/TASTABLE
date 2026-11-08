import pg from "pg";

import { expect, test, signInAs } from "./helpers";

const DB = process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/tastable_e2e";

async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const client = new pg.Client({ connectionString: DB });
  await client.connect();
  try {
    return (await client.query(sql, params)).rows as T[];
  } finally {
    await client.end();
  }
}

const hostLabel = async (slug: string) => {
  const [r] = await query<{ avg: string; n: number }>(
    `SELECT round(avg(r.rating)::numeric, 1)::text avg, count(*)::int n FROM "Review" r JOIN "HostProfile" h ON h.id = r."hostId"
     WHERE h.slug = $1 AND r."verifiedAttendance" AND r.status <> 'REMOVED'`,
    [slug],
  );
  return `${Number(r.avg).toFixed(1)} (${r.n} reviews)`;
};

test.describe.configure({ mode: "serial" });

test("a verified guest leaves, edits and sees their review; ratings update everywhere", async ({ page }) => {
  await signInAs(page, /Jordan .*demo guest/);
  const before = await hostLabel("luca-moretti");

  await page.goto("/bookings?view=past");
  const row = page.getByRole("listitem").filter({ hasText: "Italian Pasta-Making Workshop" }).filter({ has: page.getByRole("link", { name: "Leave a Review" }) });
  await row.getByRole("link", { name: "Leave a Review" }).click();
  await expect(page.getByRole("heading", { name: "Italian Pasta-Making Workshop", level: 1 })).toBeVisible();
  await expect(page.getByText(/verified review/)).toBeVisible();

  // Validation: overall rating and text are required.
  await page.getByRole("button", { name: "Post review" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Choose an overall rating." })).toBeVisible();
  await page.getByLabel("Overall: 4 of 5 (Great)").check({ force: true });
  await page.getByLabel("Food: 5 of 5 (Excellent)").check({ force: true });
  await page.getByLabel("Your review").fill("Lovely class, and the tagliatelle came out better than expected.");
  await page.getByRole("button", { name: "Post review" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Your review is live" })).toBeVisible();

  const after = await hostLabel("luca-moretti");
  expect(after).not.toBe(before);

  // Shown on the event page as the guest's own, verified review; host rating matches the database.
  await page.goto("/experiences/italian-pasta-making-workshop");
  const reviews = page.getByRole("region", { name: "Reviews" });
  const mine = reviews.getByRole("article", { name: "Review by Jordan" });
  await expect(mine.getByText("Lovely class, and the tagliatelle")).toBeVisible();
  await expect(mine.getByText("Your review")).toBeVisible();
  await expect(mine.getByText("Food 5/5")).toBeVisible();
  await expect(page.getByRole("region", { name: "Your host" }).getByText(after)).toBeVisible();

  // Edit from My Bookings: no second review is possible, the same one is updated.
  await page.goto("/bookings?view=past");
  await page.getByRole("link", { name: "Edit your review" }).first().click();
  await expect(page.getByText("Edit your review").first()).toBeVisible();
  await page.getByLabel("Overall: 2 of 5 (Fair)").check({ force: true });
  await page.getByLabel("Your review").fill("Good teaching, but the room was too warm and it ran long.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Your review was updated." })).toBeVisible();
  const [{ n }] = await query<{ n: number }>(`SELECT count(*)::int n FROM "Review" WHERE "guestId" = 'gst_jordan'`);
  expect(n).toBe(1);

  // Lowest first puts the edited 2-star review at or near the top; "edited" is shown.
  await page.goto("/experiences/italian-pasta-making-workshop?reviews=lowest#reviews");
  const first = page.getByRole("region", { name: "Reviews" }).getByRole("article").first();
  await expect(first.getByRole("img", { name: /^[12] out of 5 stars$/ })).toBeVisible();
  await expect(page.getByRole("article", { name: "Review by Jordan" }).getByText(/edited/)).toBeVisible();
});

test("public host profile: details, sortable reviews, past and upcoming events; reports never hide a review", async ({ page }) => {
  await page.goto("/experiences/italian-pasta-making-workshop");
  await page.getByRole("region", { name: "Your host" }).getByRole("link", { name: "Luca Moretti" }).click();
  await page.waitForURL(/\/hosts\/luca-moretti/);
  await expect(page.getByRole("heading", { name: "Luca Moretti", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Expertise" })).toBeVisible();
  await expect(page.getByText(await hostLabel("luca-moretti")).first()).toBeVisible();
  await expect(page.getByRole("region", { name: "Upcoming events" }).getByRole("article").first()).toBeVisible();
  await expect(page.getByRole("region", { name: "Past events" }).getByRole("listitem").first()).toBeVisible();

  await page.getByRole("link", { name: "Highest" }).click();
  await expect(page).toHaveURL(/sort=highest/);
  await expect(page.getByRole("region", { name: "Reviews" }).getByRole("article").first().getByRole("img", { name: "5 out of 5 stars" })).toBeVisible();
  await page.getByRole("link", { name: "Lowest" }).click();
  await expect(page).toHaveURL(/sort=lowest/);
  await expect(page.getByRole("region", { name: "Reviews" }).getByRole("article").first().getByRole("img", { name: /^[123] out of 5 stars$/ })).toBeVisible();

  // Zoe reports Jordan's (negative) review: it stays visible and still counts.
  const label = await hostLabel("luca-moretti");
  await signInAs(page, /Zoe .*demo guest/, "/hosts/luca-moretti?sort=lowest");
  const jordan = page.getByRole("article", { name: "Review by Jordan" });
  await jordan.getByRole("button", { name: "Report" }).click();
  await jordan.getByLabel("Reason").selectOption("OTHER");
  await jordan.getByRole("button", { name: "Send report" }).click();
  await expect(jordan.getByRole("status").filter({ hasText: /stays visible/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("article", { name: "Review by Jordan" })).toBeVisible();
  await expect(page.getByText(label).first()).toBeVisible();
  const [{ status }] = await query<{ status: string }>(`SELECT status FROM "Review" WHERE "guestId" = 'gst_jordan'`);
  expect(status).toBe("UNDER_REVIEW");
});

test("cards link host names to the host profile", async ({ page }) => {
  await page.goto("/discover");
  const card = page.getByRole("article").filter({ has: page.getByRole("link", { name: "Italian Pasta-Making Workshop" }) }).first();
  await card.getByRole("link", { name: "Luca Moretti" }).click();
  await page.waitForURL(/\/hosts\/luca-moretti/);
});
