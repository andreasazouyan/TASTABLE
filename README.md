# Tastable

**Discover experiences worth sharing.**

Tastable is a curated marketplace for unique culinary experiences in New York City: supper clubs,
cooking classes, pop-ups and social food events, for New Yorkers aged roughly 20 to 35.

> **Prototype notice.** This is an advanced prototype, not a production payments platform.
> Payments are simulated (no card data is ever requested or stored), sign-in is a demo persona
> switch, and every host, event, guest and figure in the sample data is fictional.

## Requirements

- Node.js 20.19 or newer (22 LTS recommended)
- npm 10+
- No external services: the database is a local SQLite file.

## Setup and start

```bash
npm install                 # also generates the Prisma client
cp .env.example .env        # defaults work as-is for local use
npm run setup               # create the database, apply migrations, seed demo data
npm run dev                 # http://localhost:3000
```

Open http://localhost:3000, choose **Sign in** (top right) and pick a demo identity.

## Demo identities

| Who | Use it to try |
|---|---|
| **Zoe Park** (24, student, under $60) | Budget-aware recommendations, "Under $60", pop-ups and socials |
| **Jordan Lee** (30, professional, up to $100) | Bookings, cancellations, calendar, sharing; classes and social formats |
| **Sofia Marin** (34, no budget limit) | Follows creator Priya Raman, so Priya's events lead her recommendations |
| **Alex Rivera** (new guest) | Onboarding from scratch; becoming a host via **Host** in the header |
| **Any demo host** (e.g. Maya Chen) | Host dashboard with reservations, finances and trends |

Use the **Guest / Host** switch in the header to move between the two interfaces.

## Reset the demo data

```bash
npm run demo:reset          # re-applies migrations and re-seeds; wipes all demo changes
```

The seed is deterministic: same IDs, same bookings, same tokens. Sample dates are relative to
the server clock. To freeze time for a demo, set `TASTABLE_FIXED_NOW` in `.env` and re-seed.

(`npm run db:reset` also works; it drops and recreates the database file with Prisma.)

## Tests

```bash
npm run typecheck           # Next.js route types + TypeScript
npm run lint                # ESLint
npm test                    # Vitest: unit + integration (uses a fresh prisma/test.db)
npm run test:e2e            # Playwright: builds the app and runs journeys on port 3200
```

The first E2E run needs a browser: `npx playwright install chromium` (or point
`PLAYWRIGHT_CHROMIUM_PATH` at an existing Chrome/Chromium). E2E uses its own database
(`prisma/e2e.db`) and a frozen clock, so it never touches your dev data.

What's covered:
- **Unit** pricing and fees, refund tiers at the 24h/48h boundaries, capacity and availability,
  .ics output (escaping, folding, CRLF), finance math, trend aggregation and insight thresholds,
  recommendation rules.
- **Integration** (real SQLite) booking and seat updates, no overselling under concurrent requests,
  idempotent cancellation and refunds, waitlist, filters never showing sold-out sessions as
  available, host create/publish/duplicate/cancel, owner-only authorization, venue placeholders,
  shared-calendar privacy and revocation, persona recommendations.
- **E2E** guest journey (discover → filter → detail → +1 booking → ticket with QR → .ics →
  calendar → cancel with refund preview), onboarding, shared calendar links, the host journey
  (onboard → create and publish → appears in discovery → guest books → reservations, check-in,
  finances, trends → another host can't edit), responsive pages at mobile, tablet and desktop widths,
  keyboard skip link and labelled form controls.

## Features

**Guests**
- Home with search, the four categories, "Recommended for you" and curated collections
  (This Weekend, Won't Find Anywhere Else, Perfect for Two, Meet New People, Under $60,
  Creators & Chefs, Limited Spots, Hidden Gems).
- Discover with URL-persisted filters: neighborhood and travel distance, date or date range,
  category, cuisine, price, spots needed, host type, occasion, format; plus sorting.
- Experience pages with gallery, host profile and credentials (and Follow), menu, inclusions,
  dietary options, group size, seats left per date, cancellation policy, save and share.
- Optional five-step onboarding (location, radius and budget, cuisines, categories, motivations)
  with transparent, explained recommendations, editable any time.
- Booking with a prominent +1, live price breakdown, guest details and dietary notes, policy
  acknowledgement, clearly labelled simulated payment, confirmation and QR tickets.
- My Bookings (Upcoming, Past, Cancelled, Waitlist), exact refund shown before cancelling,
  waitlist for sold-out dates.
- Calendar (month and week) for bookings, saved items and invitations; .ics export; invite a friend;
  opt-in calendar sharing per event with revocable private links.

**Hosts**
- Host onboarding (host type, bio, cuisine expertise, photo, neighborhood, credentials).
- Overview, My Events (create, edit, duplicate, publish, unpublish, cancel with full refunds),
  an 8-step event wizard, and venue assistance requests that never claim a venue was secured.
- Reservations with guest counts, dietary needs, cancellations and demo QR check-in.
- Finances: gross revenue, tickets, occupancy, average price, cancellation rate, estimated net
  revenue and profit with margin, revenue/booking/performance charts, sortable event table,
  expense tracking. Estimated profit is clearly separated from the (simulated) payout.
- Culinary Trends: My Performance vs Marketplace, trending cuisines, category comparison,
  price vs conversion, day × time heatmap, neighborhood demand, guest preferences by occasion
  and cuisine, and rule-based insights that state their metric or say there isn't enough data.

## Limitations

- **Simulated payments and payouts.** No processor, no card fields; `SIMULATED_PAYMENTS_MODE=fail`
  forces declines for testing.
- **Demo authentication.** A signed cookie identifies the chosen persona. No passwords, no
  account creation. Replace before any real use.
- **No email or notifications.** Invitations and waitlist alerts are shown in the app only.
- **Photos are placeholders** from Unsplash, loaded remotely; a styled fallback shows offline.
  Host photo "uploads" accept a URL only.
- **SQLite** is fine locally but not for concurrent multi-instance production use.
- Single market (New York City, USD, America/New_York).
- Trends and insights describe fictional sample data; they aren't market research.

## Known issues

- A 404 for a missing experience or another host's event renders the not-found page with an
  HTTP 200 status, because the check runs inside a streamed Suspense boundary.
- Remote photos need network access to images.unsplash.com; without it you'll see the fallback
  artwork and server log warnings.
- Sample dates are anchored to the clock when you seed. After a few weeks, re-run
  `npm run demo:reset` to bring upcoming events back.

## Project structure

See [CLAUDE.md](./CLAUDE.md) for architecture, conventions and invariants.
