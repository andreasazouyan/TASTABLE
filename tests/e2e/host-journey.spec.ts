import { expect, test, signInAs } from "./helpers";

const TITLE = "E2E Hand-Pulled Noodle Night";

test("host: onboard, create and publish an event, it appears in discovery, a booking shows in reservations and finances", async ({ browser }) => {
  // Alex becomes a host.
  const hostCtx = await browser.newContext();
  const host = await hostCtx.newPage();
  await signInAs(host, /Alex .*demo guest/);
  await host.goto("/host");
  await host.waitForURL(/\/host\/onboarding/);
  await host.getByText("Private chef", { exact: true }).click();
  await host.getByLabel("Host name").fill("Alex Test Kitchen");
  await host.getByLabel("Tagline").fill("Noodles pulled to order");
  await host.getByLabel("Bio").fill("A fictional host profile created by the end-to-end test suite.");
  await host.getByLabel("Culinary background").fill("Home cook for ten years");
  await host.getByText("Korean", { exact: true }).first().click();
  await host.getByLabel("Location").selectOption("williamsburg");
  await host.getByRole("button", { name: "Create host profile" }).click();
  await host.waitForURL(/\/host\?welcome=1/);
  await expect(host.getByRole("heading", { name: "Welcome to hosting on Tastable" })).toBeVisible();

  // Multi-step event creation.
  await host.goto("/host/events/new");
  await host.getByLabel("Event title").fill(TITLE);
  await host.getByLabel("One-line summary").fill("Hand-pulled noodles and small plates, test edition.");
  await host.getByLabel("Description").fill("A fictional event created by the automated tests to verify the host publishing flow end to end.");
  await host.getByRole("button", { name: "Next" }).click();
  await host.getByText("Pop-Ups & Exclusive Experiences").click();
  await host.getByLabel("Cuisine").selectOption("korean");
  await host.getByRole("button", { name: "Next" }).click();
  await host.getByRole("button", { name: "Add photo: A bowl of noodle soup" }).click();
  await host.getByRole("button", { name: "Next" }).click();
  // Venue: the host has none yet, so the assistance path is shown with an honest notice.
  await expect(host.getByText("Tastable has not secured a venue for you.")).toBeVisible();
  await host.getByText("Yes, I have a venue").click();
  await host.getByLabel("Venue name").fill("Test Loft Williamsburg");
  await host.getByLabel("Address", { exact: true }).fill("10 Fictional Street, Brooklyn");
  await host.getByRole("button", { name: "Next" }).click();
  await host.getByLabel("Ticket price (USD)").fill("70");
  await host.getByLabel("Capacity").first().fill("10");
  await host.getByRole("button", { name: "Next" }).click();
  // Menu: a course with two dishes, reordered, with a dietary label; then a featured dish.
  await host.getByRole("button", { name: "Add a course" }).click();
  await host.getByLabel("Course 1 name").fill("Noodles");
  await host.getByLabel("Noodles item 1 dish name").fill("Biang biang noodles");
  await host.getByRole("button", { name: "Add a dish to Noodles" }).click();
  await host.getByLabel("Noodles item 2 dish name").fill("Smacked cucumber");
  await host.getByRole("group", { name: "Noodles item 2 dietary labels" }).getByRole("button", { name: "Vegan" }).click();
  await host.getByRole("button", { name: "Move Noodles item 2 up" }).click();
  await expect(host.getByLabel("Noodles item 1 dish name")).toHaveValue("Smacked cucumber");
  await host.getByLabel(/Featured dishes/).fill("Hand-pulled noodles");
  await host.getByLabel(/Featured dishes/).press("Enter");
  await expect(host.getByRole("button", { name: "Remove featured dish Hand-pulled noodles" })).toBeVisible();
  await host.getByRole("button", { name: "Next" }).click();

  // Itinerary with live chronology checks.
  await host.getByRole("button", { name: "Add a step" }).click();
  await host.getByLabel("Step 1 title").fill("Welcome tea");
  await host.getByLabel("Step 1 ends, minutes after start").fill("30");
  await host.getByRole("button", { name: "Add a step" }).click();
  await host.getByLabel("Step 2 title").fill("Pull your own noodles");
  await host.getByLabel("Step 2 starts, minutes after start").fill("10");
  await expect(host.getByText("Step 2 starts before step 1 ends.").first()).toBeVisible();
  await host.getByLabel("Step 2 starts, minutes after start").fill("30");
  await expect(host.getByText("Step 2 starts before step 1 ends.")).toHaveCount(0);
  await host.getByRole("button", { name: "Next" }).click();
  await host.getByRole("button", { name: "Next" }).click();

  // Preview before publishing.
  await expect(host.getByText("Ready to publish.")).toBeVisible();
  const preview = host.getByRole("region", { name: "How guests will see it" });
  await expect(preview.getByRole("heading", { name: "The Menu" })).toBeVisible();
  await expect(preview.getByRole("listitem").filter({ hasText: "Smacked cucumber" }).getByText("Vegan")).toBeVisible();
  await expect(preview.getByText("Welcome tea")).toBeVisible();
  await expect(preview.getByText("7:30 PM")).toBeVisible();
  await host.getByRole("button", { name: "Publish event" }).click();
  await host.waitForURL(/\/host\/events\?status=PUBLISHED/);
  await expect(host.getByRole("heading", { name: TITLE })).toBeVisible();

  // It appears in guest discovery.
  const guestCtx = await browser.newContext();
  const guest = await guestCtx.newPage();
  await signInAs(guest, /Jordan .*demo guest/);
  await guest.goto(`/discover?q=${encodeURIComponent("Hand-Pulled Noodle")}`);
  await guest.getByRole("link", { name: new RegExp(TITLE) }).first().click();
  const menu = guest.getByRole("region", { name: "The Menu" });
  await expect(menu.getByText("Smacked cucumber")).toBeVisible();
  await expect(menu.getByText("Biang biang noodles")).toBeVisible();
  const timeline = guest.getByRole("region", { name: "Your Experience" });
  await expect(timeline.getByText("7:00 PM")).toBeVisible();
  await expect(timeline.getByText("Pull your own noodles")).toBeVisible();
  await guest.getByRole("link", { name: "Book now" }).first().click();
  await guest.getByRole("button", { name: "Add a ticket", exact: true }).click();
  await guest.getByRole("checkbox", { name: /cancellation policy/ }).check();
  await guest.getByRole("checkbox", { name: /simulated payment/ }).check();
  await guest.getByRole("button", { name: /Confirm demo booking/ }).click();
  await guest.waitForURL(/\/bookings\/TBL-/);

  // Reservations and finances update.
  await host.goto("/host/reservations");
  const block = host.locator("section", { hasText: TITLE });
  await expect(block.getByText("2/10")).toBeVisible();
  await expect(block.getByText(/TKT-/).first()).toBeVisible();
  const code = (await block.getByText(/TKT-/).first().innerText()).trim();
  await host.getByLabel(/Check in a guest/).fill(code);
  await host.getByRole("button", { name: "Check in", exact: true }).click();
  await expect(host.getByRole("status").filter({ hasText: /Checked in/ })).toBeVisible();

  await host.goto("/host/finances?range=7");
  await expect(host.getByText("$140").first()).toBeVisible();

  await host.goto("/host/trends?scope=mine");
  await expect(host.getByRole("heading", { name: "Culinary Trends" })).toBeVisible();
  await host.goto("/host/trends");
  await expect(host.getByRole("heading", { name: "Demand by day and time" })).toBeVisible();

  // Another host cannot edit Alex's event.
  await host.goto("/host/events?status=PUBLISHED");
  const editHref = await host.getByRole("link", { name: "Edit" }).first().getAttribute("href");
  const mayaCtx = await browser.newContext();
  const maya = await mayaCtx.newPage();
  await signInAs(maya, "Maya Chen");
  await maya.goto(editHref!);
  await expect(maya.getByText(/could not be found/i)).toBeVisible();
  await expect(maya.getByLabel("Event title")).toHaveCount(0);
});
