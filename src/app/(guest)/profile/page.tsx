import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, ChefHat, Heart, MessageSquareText, Star, Ticket } from "lucide-react";

import { PreferencesEditor } from "@/components/onboarding/preferences-editor";
import { EmptyState } from "@/components/site/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth/demo";
import { db } from "@/lib/db";
import { formatDate, formatTime } from "@/lib/format";
import { toPrefsValue } from "@/lib/domain/preferences-value";
import { requestNow } from "@/lib/request-clock";
import { signOut } from "@/server/actions/auth";
import { getGuestBookings, splitBookings } from "@/server/queries/bookings";
import { getGuestPreferences } from "@/server/queries/preferences";
import { getGuestReviews } from "@/server/queries/reviews";

export const metadata: Metadata = { title: "My Profile" };

export default function ProfilePage() {
  return (
    <div className="container-page max-w-4xl pt-8 pb-16 sm:pt-12">
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <Profile />
      </Suspense>
    </div>
  );
}

const SECTIONS = [
  { id: "preferences", label: "My Preferences" },
  { id: "bookings", label: "My Bookings" },
  { id: "saved", label: "Saved Experiences" },
  { id: "reviews", label: "My Reviews" },
];

function SectionHeader({ id, title, href, linkLabel }: { id: string; title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <h2 id={`${id}-title`} className="text-3xl">
        {title}
      </h2>
      {href && (
        <Link href={href} className="inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline">
          {linkLabel} <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

async function Profile() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="py-10 text-center">
        <h1 className="text-4xl">My Profile</h1>
        <p className="mt-3 text-muted-foreground">Log in or create an account to see bookings, saved experiences and preferences.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link href="/sign-up">Create an account</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/sign-in?next=/profile">Log in</Link>
          </Button>
        </div>
      </div>
    );
  }
  const now = await requestNow();
  const guest = user.guestProfile;
  const [prefs, bookings, saved, reviews] = guest
    ? await Promise.all([
        getGuestPreferences(guest.id),
        getGuestBookings(guest.id),
        db.savedExperience.findMany({
          where: { guestId: guest.id },
          orderBy: { createdAt: "desc" },
          take: 4,
          select: { experience: { select: { slug: true, title: true, host: { select: { displayName: true } } } } },
        }),
        getGuestReviews(guest.id),
      ])
    : [null, [], [], []];
  const split = splitBookings(bookings, now);
  const savedCount = guest ? await db.savedExperience.count({ where: { guestId: guest.id } }) : 0;
  const displayName = guest?.displayName ?? user.name;

  return (
    <>
      <header className="mb-8 flex flex-wrap items-center gap-5">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" className="size-20 rounded-full object-cover" />
        ) : (
          <span aria-hidden className="grid size-20 place-items-center rounded-full bg-brand-soft font-display text-3xl text-accent-foreground">
            {displayName[0]}
          </span>
        )}
        <div className="flex-1">
          <p className="eyebrow mb-1">My Profile</p>
          <h1 className="text-4xl">{displayName}</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/sign-in">Switch account</Link>
          </Button>
          <form action={signOut}>
            <Button type="submit" variant="ghost">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <nav aria-label="Profile sections" className="mb-10 flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="rounded-full border bg-card px-4 py-2 text-sm hover:border-foreground/30">
            {s.label}
          </a>
        ))}
        <Link href="/host" className="inline-flex items-center gap-1.5 rounded-full border bg-card px-4 py-2 text-sm hover:border-foreground/30">
          <ChefHat className="size-4 text-brand" aria-hidden /> {user.hostProfile ? "Host dashboard" : "Become a host"}
        </Link>
      </nav>

      {guest && prefs && (
        <section id="preferences" aria-labelledby="preferences-title" className="scroll-mt-24 rounded-2xl border bg-card p-6 shadow-soft sm:p-8">
          <SectionHeader id="preferences" title="My Preferences" />
          <p className="-mt-3 mb-8 text-sm text-muted-foreground">
            {prefs.status === "COMPLETED" ? "Change any answer and save; your recommendations update right away." : "You haven't finished onboarding yet. Answer here or "}
            {prefs.status !== "COMPLETED" && (
              <Link href="/onboarding" className="font-medium underline underline-offset-4">
                go through the six steps
              </Link>
            )}
            {prefs.lastUpdatedAt && <span className="block pt-1">Last updated {formatDate(prefs.lastUpdatedAt, { month: "short", day: "numeric", year: "numeric" })}.</span>}
          </p>
          <PreferencesEditor
            initial={toPrefsValue(prefs)}
            initialExtras={{ maxBudgetDollars: prefs.maxBudgetCents === null ? null : prefs.maxBudgetCents / 100, motivations: prefs.motivations }}
          />
        </section>
      )}

      <section id="bookings" aria-labelledby="bookings-title" className="mt-16 scroll-mt-24">
        <SectionHeader id="bookings" title="My Bookings" href="/bookings" linkLabel={`All bookings (${bookings.length})`} />
        {split.upcoming.length ? (
          <ul className="divide-y rounded-2xl border bg-card">
            {split.upcoming.slice(0, 3).map((b) => (
              <li key={b.id}>
                <Link href={`/bookings/${b.reference}`} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-muted/40">
                  <span className="flex items-center gap-3">
                    <Ticket className="size-5 text-brand" aria-hidden />
                    <span>
                      <span className="block font-medium">{b.session.experience.title}</span>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(b.session.startsAt)} · {formatTime(b.session.startsAt)} · {b.ticketCount} {b.ticketCount === 1 ? "ticket" : "tickets"}
                      </span>
                    </span>
                  </span>
                  <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={Ticket} title="No upcoming bookings" description="When you book an experience it shows up here.">
            <Button asChild variant="outline">
              <Link href="/discover">Discover experiences</Link>
            </Button>
          </EmptyState>
        )}
      </section>

      <section id="saved" aria-labelledby="saved-title" className="mt-16 scroll-mt-24">
        <SectionHeader id="saved" title="Saved Experiences" href="/saved" linkLabel={`All saved (${savedCount})`} />
        {saved.length ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {saved.map((s) => (
              <li key={s.experience.slug}>
                <Link href={`/experiences/${s.experience.slug}`} className="flex items-center gap-3 rounded-2xl border bg-card p-4 hover:border-foreground/25">
                  <Heart className="size-5 shrink-0 fill-brand text-brand" aria-hidden />
                  <span>
                    <span className="block font-medium">{s.experience.title}</span>
                    <span className="text-sm text-muted-foreground">Hosted by {s.experience.host.displayName}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={Heart} title="Nothing saved yet" description="Tap the heart on any experience to keep it here." />
        )}
      </section>

      <section id="reviews" aria-labelledby="reviews-title" className="mt-16 scroll-mt-24">
        <SectionHeader id="reviews" title="My Reviews" />
        {reviews.length ? (
          <ul className="space-y-3">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-2xl border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/experiences/${r.experience.slug}`} className="font-medium hover:underline">
                    {r.experience.title}
                  </Link>
                  <span className="flex items-center gap-1 text-sm" aria-label={`${r.rating} out of 5 stars`}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} className={i < r.rating ? "size-4 fill-brand text-brand" : "size-4 text-muted-foreground"} aria-hidden />
                    ))}
                  </span>
                </div>
                <p className="mt-2 text-sm">{r.body}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Reviewed {formatDate(r.createdAt, { month: "short", day: "numeric", year: "numeric" })}
                  {r.editedAt && " · edited"}
                  {r.status === "UNDER_REVIEW" && " · being checked by our team, still visible"}
                  {r.status === "REMOVED" && " · removed by moderation"}
                  {r.status !== "REMOVED" && (
                    <>
                      {" · "}
                      <Link href={`/bookings/${r.booking.reference}/review`} className="font-medium text-foreground underline-offset-4 hover:underline">
                        Edit review
                      </Link>
                    </>
                  )}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={MessageSquareText} title="No reviews yet" description="After you attend an experience, you can review it from My Bookings." />
        )}
      </section>
    </>
  );
}
