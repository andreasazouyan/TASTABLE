import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

import { CardRow, CardRowItem } from "@/components/experiences/card-row";
import { ExperienceCard } from "@/components/experiences/experience-card";
import { Photo } from "@/components/site/photo";
import { SearchBar } from "@/components/site/search-bar";
import { SectionHeading } from "@/components/site/section-heading";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth/demo";
import { requestNow } from "@/lib/request-clock";
import { CATEGORIES } from "@/lib/domain/categories";
import { PHOTOS, type PhotoKey } from "@/lib/domain/photos";
import { COLLECTIONS, applyFilters, filtersSchema, type CollectionKey } from "@/lib/discovery/filters";
import { getSavedIds } from "@/server/queries/guest";
import { getListings, getMarketplaceStats } from "@/server/queries/listings";
import { getRecommendations } from "@/server/queries/recommendations";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Categories />
      <Suspense fallback={<RowSkeleton title="Recommended for You" />}>
        <RecommendedForYou />
      </Suspense>
      <Suspense fallback={<RowSkeleton title="Curated collections" />}>
        <Collections />
      </Suspense>
      <HostBand />
    </>
  );
}

function Hero() {
  return (
    <section aria-labelledby="hero-title" className="container-page pt-4 sm:pt-6">
      <div className="relative isolate overflow-hidden rounded-[1.75rem] bg-foreground">
        <Photo
          src={PHOTOS.heroTable.src}
          alt=""
          theme="charcoal"
          priority
          sizes="100vw"
          className="absolute inset-0 -z-10"
          imageClassName="opacity-80"
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/75 via-black/35 to-black/10" />
        <div className="flex min-h-[30rem] flex-col justify-end px-5 pt-24 pb-6 sm:min-h-[34rem] sm:px-10 sm:pb-10 lg:min-h-[38rem] lg:px-14 lg:pb-14">
          <p className="mb-4 text-xs font-semibold tracking-[0.18em] text-white/80 uppercase">New York · Supper clubs · Classes · Pop-ups</p>
          <h1 id="hero-title" className="max-w-3xl text-[2.6rem] leading-[1.02] font-normal text-white sm:text-6xl lg:text-7xl">
            Discover experiences worth sharing.
          </h1>
          <p className="mt-4 max-w-xl text-base text-white/85 sm:text-lg">
            Hidden tables, hands-on classes and one-night pop-ups from New York&apos;s chefs and food creators, from $35 a seat. Bring
            your friends or meet new ones. Clear cancellation terms, tickets on your phone.
          </p>
          <SearchBar className="mt-8 max-w-3xl" />
        </div>
      </div>
    </section>
  );
}

function Categories() {
  return (
    <section aria-labelledby="categories-title" className="container-page mt-16 sm:mt-24">
      <SectionHeading id="categories-title" eyebrow="Four ways in" title="What are you in the mood for?" />
      <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          const photo = PHOTOS[c.photo as PhotoKey];
          return (
            <li key={c.id}>
              <Link
                href={`/discover?category=${c.slug}`}
                className="group relative isolate flex aspect-[3/4] flex-col justify-end overflow-hidden rounded-2xl p-4 text-white shadow-soft transition-shadow duration-300 hover:shadow-lift focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none sm:aspect-[4/5] sm:p-5"
              >
                <Photo
                  src={photo.src}
                  alt=""
                  theme="charcoal"
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  className="absolute inset-0 -z-10"
                  imageClassName="group-hover:scale-[1.04]"
                />
                <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                <Icon className="mb-3 size-5 text-white/90" strokeWidth={1.5} aria-hidden />
                <span className="font-display text-lg leading-tight sm:text-[1.35rem]">{c.name}</span>
                <span className="mt-1.5 hidden text-sm text-white/80 sm:block">{c.description}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

async function RecommendedForYou() {
  const user = await getCurrentUser();
  const prefs = user?.guestProfile?.preferences;
  if (!user || !prefs?.onboardingCompletedAt) {
    return (
      <section className="container-page mt-16 sm:mt-24" aria-labelledby="personalise-title">
        <div className="flex flex-col items-start gap-5 rounded-2xl border bg-card p-6 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-soft text-accent-foreground">
              <Sparkles className="size-5" aria-hidden />
            </span>
            <div>
              <h2 id="personalise-title" className="text-xl">
                Get recommendations that explain themselves
              </h2>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Tell us where you are, what you like to eat and why you go out. Five quick steps, all optional.
              </p>
            </div>
          </div>
          <Button asChild variant="default">
            <Link href={user ? "/onboarding" : "/sign-in?next=/onboarding"}>
              Personalise Tastable <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </section>
    );
  }

  const now = await requestNow();
  const [recs, saved] = await Promise.all([getRecommendations(prefs, now, 4), getSavedIds(user.guestProfile?.id)]);
  return (
    <section className="container-page mt-16 sm:mt-24" aria-labelledby="recommended-title">
      <SectionHeading
        id="recommended-title"
        eyebrow="Recommended for you"
        title={`Picked for you, ${user.name.split(" ")[0]}`}
        description="Ranked by simple rules from your preferences. Each card says why it's here."
        href="/profile/preferences"
        linkLabel="Edit preferences"
      />
      {recs.length ? (
        <CardRow label="Recommended for you">
          {recs.map((r) => (
            <CardRowItem key={r.listing.id}>
              <ExperienceCard listing={r.listing} saved={saved.has(r.listing.id)} reason={`Why: ${r.reasons.join(" · ")}`} />
            </CardRowItem>
          ))}
        </CardRow>
      ) : (
        <p className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
          Nothing matches all of your preferences right now. Try widening your travel radius in{" "}
          <Link href="/profile/preferences" className="text-brand underline">
            your preferences
          </Link>
          .
        </p>
      )}
    </section>
  );
}

async function Collections() {
  const now = await requestNow();
  const [listings, user, stats] = await Promise.all([getListings(now.toISOString()), getCurrentUser(), getMarketplaceStats()]);
  const saved = await getSavedIds(user?.guestProfile?.id);
  // Prefer listings not already shown in an earlier collection, so rows feel distinct.
  const shown = new Set<string>();
  const collections = COLLECTIONS.map((c) => {
    const matches = applyFilters(listings, filtersSchema.parse({ collection: c.key }), now);
    const items = [...matches.filter((m) => !shown.has(m.id)), ...matches.filter((m) => shown.has(m.id))].slice(0, 4);
    items.forEach((m) => shown.add(m.id));
    return { ...c, items };
  }).filter((c) => c.items.length > 0);

  return (
    <div className="mt-16 space-y-16 sm:mt-24 sm:space-y-24">
      {collections.map((c, i) => (
        <section key={c.key} className="container-page" aria-labelledby={`col-${c.key}`}>
          <SectionHeading
            id={`col-${c.key}`}
            eyebrow={i === 0 ? `${stats.experiences} sample experiences · ${stats.neighborhoods} neighborhoods` : undefined}
            title={c.title}
            description={c.blurb}
            href={`/discover?collection=${c.key satisfies CollectionKey}`}
          />
          <CardRow label={c.title}>
            {c.items.map((l, j) => (
              <CardRowItem key={l.id}>
                <ExperienceCard listing={l} saved={saved.has(l.id)} priority={i === 0 && j < 2} />
              </CardRowItem>
            ))}
          </CardRow>
        </section>
      ))}
    </div>
  );
}

function HostBand() {
  return (
    <section className="container-page mt-20 sm:mt-28" aria-labelledby="host-band-title">
      <div className="grid overflow-hidden rounded-[1.75rem] bg-foreground text-background lg:grid-cols-2">
        <div className="p-8 sm:p-12">
          <p className="mb-3 text-xs font-semibold tracking-[0.18em] text-[#e7b9a3] uppercase">For hosts</p>
          <h2 id="host-band-title" className="text-3xl leading-tight sm:text-4xl">
            Reach guests beyond your followers.
          </h2>
          <p className="mt-4 max-w-md text-background/75">
            Ticketing, guest lists, QR check-in, venue support requests and simple finances in one place. Switch to Host mode to
            explore the demo dashboard.
          </p>
          <Button asChild variant="brand" size="lg" className="mt-8">
            <Link href="/host">
              Explore Host mode <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
        <Photo src={PHOTOS.kitchenClass.src} alt="" theme="charcoal" sizes="(min-width: 1024px) 50vw, 100vw" className="min-h-64" />
      </div>
    </section>
  );
}

function RowSkeleton({ title }: { title: string }) {
  return (
    <div className="container-page mt-16 sm:mt-24" aria-busy="true" aria-label={`Loading ${title}`}>
      <Skeleton className="mb-6 h-8 w-64" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-[4/3] rounded-2xl" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
