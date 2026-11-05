import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

import { Carousel, CarouselItem } from "@/components/experiences/carousel";
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
import { areaRow, categoryCounts, featuredRow, HOME_ROW_SIZE, popularRow, starterRow, upcomingForHome } from "@/lib/discovery/home-sections";
import type { ListingMatch } from "@/lib/discovery/types";
import { getSavedIds } from "@/server/queries/guest";
import { getListings } from "@/server/queries/listings";
import { getRecommendations } from "@/server/queries/recommendations";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Suspense fallback={<HomeSkeleton />}>
        <HomeSections />
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

/** Everything below the hero reads one set of listings, the same data Discover and Calendar use. */
async function HomeSections() {
  const now = await requestNow();
  const [listings, user] = await Promise.all([getListings(now.toISOString()), getCurrentUser()]);
  const prefs = user?.guestProfile?.preferences ?? null;
  const onboarded = !!prefs?.onboardingCompletedAt;
  const [saved, recs] = await Promise.all([
    getSavedIds(user?.guestProfile?.id),
    onboarded && prefs ? getRecommendations(prefs, now, HOME_ROW_SIZE) : Promise.resolve(null),
  ]);

  const upcoming = upcomingForHome(listings, now);
  const counts = categoryCounts(upcoming);
  const popular = popularRow(upcoming);
  const area = areaRow(upcoming, prefs?.locationKey);
  const featured = featuredRow(upcoming);
  const firstName = user?.name.split(" ")[0];

  return (
    <div className="mt-16 space-y-16 sm:mt-24 sm:space-y-24">
      <Categories counts={counts} />

      <section className="container-page" aria-labelledby="recommended-title">
        <SectionHeading
          id="recommended-title"
          eyebrow="Recommended for you"
          title={recs && firstName ? `Picked for you, ${firstName}` : "Recommended for You"}
          description={
            recs
              ? "Ranked by simple rules from your experience types, days and times, neighborhood, budget and who you go with. Each card says why it's here."
              : "A taste of every category to start with. Tell us what you like and this row becomes yours."
          }
          href="/discover?sort=recommended"
          linkLabel="See all"
        />
        {recs ? (
          recs.length ? (
            <Carousel label="Recommended for you">
              {recs.map((r, i) => (
                <CarouselItem key={r.listing.id}>
                  <ExperienceCard
                    listing={r.listing}
                    saved={saved.has(r.listing.id)}
                    reason={`Why: ${r.reasons.slice(0, 2).join(" · ")}`}
                    priority={i < 2}
                  />
                </CarouselItem>
              ))}
            </Carousel>
          ) : (
            <p className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
              Nothing is bookable within your limits right now. Try adjusting your budget or travel answers in{" "}
              <Link href="/profile#preferences" className="text-brand underline">
                your preferences
              </Link>
              .
            </p>
          )
        ) : (
          <>
            <PersonaliseNudge signedIn={!!user} />
            <Carousel label="Recommended for you">
              {starterRow(upcoming).map((l, i) => (
                <CarouselItem key={l.id}>
                  <ExperienceCard listing={l} saved={saved.has(l.id)} priority={i < 2} />
                </CarouselItem>
              ))}
            </Carousel>
          </>
        )}
        {recs && (
          <p className="mt-4 text-sm text-muted-foreground">
            Not quite right?{" "}
            <Link href="/profile#preferences" className="text-foreground underline underline-offset-4">
              Edit your preferences
            </Link>
            .
          </p>
        )}
      </section>

      <HomeRow
        id="popular"
        eyebrow="Most saved"
        title="Popular in NYC"
        description="Ranked by how many guests saved each experience, most saved first. Save counts on sample listings come from simulated demo guests."
        href="/discover?sort=popular"
        items={popular}
        saved={saved}
        badge={(_, i) => `#${i + 1}`}
      />

      <HomeRow
        id="area"
        eyebrow={area.borough ? "Near you" : "Around the five boroughs"}
        title={area.title}
        description={
          area.borough
            ? "A spread of neighborhoods in your borough, from the area you chose when you set up Tastable."
            : "A few experiences from across the city. Add your neighborhood in your preferences to see your borough here."
        }
        href={area.href}
        items={area.items}
        saved={saved}
      />

      <HomeRow
        id="featured"
        eyebrow="Hand-picked"
        title="Featured Experiences"
        description="A small selection our team is excited about this season."
        href="/discover?collection=featured"
        items={featured}
        saved={saved}
        badge={() => "Featured"}
      />
    </div>
  );
}

function HomeRow({
  id,
  eyebrow,
  title,
  description,
  href,
  items,
  saved,
  badge,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  items: ListingMatch[];
  saved: Set<string>;
  badge?: (l: ListingMatch, i: number) => string | undefined;
}) {
  if (!items.length) return null;
  return (
    <section className="container-page" aria-labelledby={`${id}-title`}>
      <SectionHeading id={`${id}-title`} eyebrow={eyebrow} title={title} description={description} href={href} linkLabel="See all" />
      <Carousel label={title}>
        {items.map((l, i) => (
          <CarouselItem key={l.id}>
            <ExperienceCard listing={l} saved={saved.has(l.id)} badge={badge?.(l, i)} />
          </CarouselItem>
        ))}
      </Carousel>
    </section>
  );
}

function PersonaliseNudge({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="mb-6 flex flex-col items-start gap-4 rounded-2xl border bg-card p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex gap-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-accent-foreground">
          <Sparkles className="size-5" aria-hidden />
        </span>
        <p className="max-w-xl text-sm text-muted-foreground">
          <span className="block font-medium text-foreground">Get recommendations that explain themselves</span>
          Tell us where you are, when you like to go out, your budget and what you love to eat. Six quick steps, and you can skip any time.
        </p>
      </div>
      <Button asChild variant="default">
        <Link href={signedIn ? "/onboarding" : "/sign-in?next=/onboarding"}>
          Personalise Tastable <ArrowRight aria-hidden />
        </Link>
      </Button>
    </div>
  );
}

function Categories({ counts }: { counts: Record<string, number> }) {
  return (
    <section aria-labelledby="categories-title" className="container-page">
      <SectionHeading
        id="categories-title"
        eyebrow="Browse by category"
        title="What are you in the mood for?"
        href="/discover"
        linkLabel="See all"
      />
      <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          const photo = PHOTOS[c.photo as PhotoKey];
          const n = counts[c.id] ?? 0;
          return (
            <li key={c.id}>
              <Link
                href={`/discover?category=${c.slug}`}
                aria-label={`${c.name}: ${n} upcoming ${n === 1 ? "experience" : "experiences"}`}
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
                <span className="absolute top-3 right-3 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur sm:top-4 sm:right-4">
                  {n} upcoming
                </span>
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

function HomeSkeleton() {
  return (
    <div className="container-page mt-16 sm:mt-24" aria-busy="true" aria-label="Loading your Home page">
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
