# Tastable: guide for AI assistants and contributors

Tastable is a curated marketplace for unique culinary experiences in New York City.
Tagline: **"Discover experiences worth sharing."**

**This is an advanced prototype, not a production payments platform.** Every transaction is
simulated, authentication is a demo persona switch, and all hosts, events, guests and figures
are fictional. Never add real charges, never collect card data, never imply sample content is real.

@AGENTS.md

## Audience

New Yorkers aged roughly **20–35**. Three reference personas (seeded as demo guests, see
`src/lib/domain/personas.ts`):

| Persona | Who | Budget | What they want |
|---|---|---|---|
| **Zoe Park, 24** | Master's student, East Village | Low: under $60 | Unique, stylish nights out with friends; pop-ups and socials |
| **Jordan Lee, 30** | Working professional, Williamsburg | Medium: up to $100 | Learn cooking skills while meeting new people |
| **Sofia Marin, 34** | Loves beautiful spaces and decor | High: no limit | Will pay a lot to attend events by one creator she follows (Priya Raman) |

Alex Rivera (27, new in town) is the fresh, un-onboarded guest for trying onboarding.

What this means in practice:
- Keep a real spread of prices ($35–$180) with enough under $60 (the "Under $60" collection).
- Budget is a first-class preference: onboarding asks for it; recommendations leave out
  over-budget items (except from followed hosts) and say "within your $60 budget".
- Following a host is the strongest recommendation signal ("Hosted by X, whom you follow").
- Copy is warm, confident and concise; editorial, not corporate or "SaaS". No emojis.

## The four categories (exactly four)

| Enum | Name | Slug |
|---|---|---|
| `SUPPER_CLUB_PRIVATE_DINING` | Supper Clubs & Private Dining | `supper-clubs` |
| `COOKING_CLASS_WORKSHOP` | Cooking Classes & Workshops | `classes` |
| `POPUP_EXCLUSIVE` | Pop-Ups & Exclusive Experiences | `pop-ups` |
| `SOCIAL_CULINARY` | Social Culinary Experiences | `social` |

Single source of truth: `src/lib/domain/categories.ts`. **Host type** (private chef, creator,
culinary professional, supper club organizer, other) is a separate dimension, never a category.

## Architecture

- **Next.js 16 App Router** with `cacheComponents` (Partial Prerendering). Read
  `node_modules/next/dist/docs/` before using an API you aren't sure of. Rules that bite:
  - Uncached data (cookies, DB reads, the clock) must render inside `<Suspense>`.
  - Read the time with `requestNow()` (`src/lib/request-clock.ts`) in server components.
  - Client components using `usePathname`/`useSearchParams` need a Suspense boundary.
  - `PageProps<"/route">` / `LayoutProps` are global types from `next typegen`.
- **Prisma 7 + SQLite** via `@prisma/adapter-better-sqlite3`. Client is generated to
  `src/generated/prisma` (import from `@/generated/prisma/client` or `/enums`). After schema
  changes: `npx prisma migrate dev --name x` **then** `npx prisma generate` (v7 doesn't auto-generate).
  Lists are comma-separated strings; structured text (menu, highlights) is JSON.
- **Tailwind v4** tokens in `src/app/globals.css`; **shadcn/ui**-style components hand-written in
  `src/components/ui` (new-york style on `radix-ui`).
- Zod 4 for every input (`src/lib/validation`), Recharts for charts, Lucide icons.

```
src/
  app/(guest)/       guest pages: home, discover, experiences, book, bookings, calendar, saved, profile, onboarding, sign-in, c/[token], invite/[token]
  app/host/          host dashboard: overview, events (+ wizard), reservations, finances, trends, profile, venue-request
  app/api/           .ics exports
  components/        ui/, site/, experiences/, discover/, booking/, onboarding/, host/
  lib/               pure logic (no DB): booking/, discovery/, analytics/, calendar/, domain/, validation/, auth/, clock
  server/actions/    server actions ("use server"), thin: validate → service → revalidate
  server/services/   transactional domain logic (bookings, host events) taking a Prisma client
  server/queries/    read models for pages
prisma/              schema, migrations, seed.ts + seed-data.ts
tests/unit           pure logic (Vitest)
tests/integration    services against a freshly seeded prisma/test.db (Vitest)
tests/e2e            Playwright journeys against a production build and prisma/e2e.db
```

## Conventions and invariants

- **One server clock**: `serverNow()` (`src/lib/clock.ts`); honours `TASTABLE_FIXED_NOW`. Never call
  `new Date()` for business logic. Dates display in `America/New_York`.
- **Capacity lives on `ExperienceSession`** (`capacity`, `seatsReserved`). Bookings reserve seats with
  an atomic conditional `UPDATE` inside the transaction. Never show a session with 0 seats as
  available (`src/lib/booking/capacity.ts`).
- **Refunds** are computed by `quoteCancellation()` (`src/lib/booking/cancellation.ts`) from the terms
  snapshotted on the booking (`policySnapshot`), never the event's current policy, and shown before
  confirming. New bookings accept the platform policy `LATE_FEE_24H_25`: free until 24h before (exactly
  24h is on time), then a 25% fee on the ticket subtotal (not the service fee), kept from what was paid.
  Older bookings keep their tiered terms. Cancellation is idempotent (conditional status transition) and
  records `cancellationFeeCents`, which host finances keep.
- **Reminders** are in-app only (`BookingReminder`, 24h before; `src/server/services/reminders.ts`),
  moved on reschedule and cancelled with the booking. Booking .ics files carry a 24h VALARM. Never claim
  an email or push reminder was sent.
- **Authorization**: every host mutation goes through `assertOwnsExperience`. Guests only see their own
  bookings. Shared calendars expose event-level data only, behind non-guessable, revocable tokens.
- **Venues**: never claim Tastable secured a venue. "Venue to be confirmed" events stay drafts.
- **Analytics** are derived from rows at request time, labelled as simulated, and insights only fire
  above minimum sample sizes. No invented confidence or market claims.
- **Guest preferences**: one `GuestPreferences` row per guest, written only through
  `saveGuestPreferences` (`src/server/services/preferences.ts`): partial patches, server-side Zod
  validation, dishes normalized via `src/lib/domain/dishes.ts`. Vocabulary (days, two-hour time
  slots with overlap matching, travel minutes, SOLO/FRIENDS_OR_PARTNER/DEPENDS) lives in
  `src/lib/domain/preferences.ts`. Travel time is never converted to or from distance.
- **Host audience insights** (`src/server/queries/audience-insights.ts`) aggregate in SQL and
  apply `src/lib/analytics/privacy.ts` thresholds (segment >= 10, bucket >= 5). Never return
  per-guest rows or identities to hosts.
- **Culinary Demand Insights** (`/host/insights`) renders `getAudienceInsights` (stated interest) beside
  `bookedByCategory` (actual bookings, kept separate). Labels and rule-based "Smart insights" live in
  `src/lib/analytics/demand-insights.ts`; every insight states its counts and fires only on visible buckets.
- **AI-assisted Create Event**: no AI provider is configured, so "Let AI Create the Event" uses the
  deterministic, rule-based generator in `src/lib/event-concepts/generate.ts` (aggregated demand only,
  Zod-validated `eventConcept` output, labelled "Demo generator" in the UI; never claim a live model).
  It only prefills the wizard: venue, photos and policy stay with the host, prefilled steps are marked
  "Suggested", and publishing requires the host's explicit confirmation. AI never publishes.
- **NYC locations**: one vocabulary in `src/lib/domain/neighborhoods.ts` (five `BOROUGHS`, ~150
  `NEIGHBORHOODS` with aliases for older spellings). Venues store the neighborhood/borough *name*;
  resolve with `neighborhoodForName` / `boroughKeyForName`. Discover's `borough` + `neighborhood`
  params (`src/lib/discovery/location.ts`): a borough with no neighborhoods ticked means the whole
  borough. Discover's `when` param (`src/lib/discovery/dates.ts`) resolves quick dates in New York time.
- **Saves**: `Experience.saveCount` = unique savers, changed only via `src/server/services/saved.ts`.
- **Reviews**: one per booking/session, verified by a checked-in ticket, relationships derived from
  the booking (`src/server/services/reviews.ts`). One rating calculation: `ratingSummary` in
  `src/lib/reviews.ts`. Reports never hide a review automatically (UNDER_REVIEW stays public and
  counted; only `moderateReview` "remove" hides one). Guests leave/edit reviews at
  `/bookings/[reference]/review`; public reviews show first names only. Public host profiles live
  at `/hosts/[slug]` (`src/server/queries/host-profile.ts`).
- **Event content**: structured menu sections, itinerary (minutes from start) and featured dishes;
  the legacy `Experience.menu` JSON is kept in sync by `saveEvent`. Guests see them through
  `EventMenu` ("The Menu" / "What You'll Cook" / "What You'll Enjoy", menu status) and
  `ExperienceTimeline` ("Your Experience", New York time); the host wizard previews the same components.
- **Event images**: Tastable's own images live in `public/tastable-event-images` and are matched to
  sample events by filename in `src/lib/domain/event-images.ts` (cover photo; Unsplash placeholders
  fill the rest). `scripts/apply-event-images.ts` adds them to already-seeded databases (additive,
  idempotent, fictional events only; runs in `vercel-build`).
- **Migrations are additive only** (no drops/renames/deletes, no invented backfills). Run
  `npm run db:check` for read-only integrity checks.
- Money is stored in integer cents. Platform fee 10% of net ticket revenue; guest service fee 6% capped at $25.

## Demo data rules

- Everything seeded is fictional and labelled (`isFictional`, "Sample listing", demo banner).
  Emails use `@example.com`. Photos are Unsplash placeholders and don't depict the sample hosts.
- The seed is deterministic (seeded LCG, fixed IDs) and wipes all tables first, so
  `npm run demo:reset` always returns to the same state for the current clock.
- Fixed tokens for demos: shared calendar `/c/demo-share-jordan-k7Qm2xV9pL4tR8wN3cY6`,
  invitation `/invite/demo-invite-alex-Hq3Zt8LmV2nP6yR1sK9w`.

## Workflow

```bash
npm run dev          # http://localhost:3000
npm run typecheck    # next typegen + tsc
npm run lint
npm test             # Vitest unit + integration (builds prisma/test.db)
npm run test:e2e     # Playwright (builds the app, uses prisma/e2e.db, port 3200)
npm run demo:reset   # re-apply migrations and re-seed the demo data
npm run build
```

Before finishing a change: typecheck, lint and `npm test` must pass; run the E2E suite for
UI-flow changes. Don't claim tests pass unless you ran them.
