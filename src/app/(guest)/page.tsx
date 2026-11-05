import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

import { Carousel, CarouselItem } from "@/components/experiences/carousel";
import { ExperienceCard } from "@/components/experiences/experience-card";
import { HomeSearch } from "@/components/site/home-search";
import { Photo } from "@/components/site/photo";
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

/**
 * Guest Home: a compact marketplace. Search first, then the four categories, then four
 * carousels. Discover is where full search, filters and date-first browsing live.
 */
export default function HomePage() {
  return (
    <>
      <div className="container-page pt-5 sm:pt-7">
        <HomeSearch className="mx-auto max-w-3xl" />
      </div>
      <Suspense fallback={<HomeSkeleton />}>
        <HomeSections />
      </Suspense>
      <HostBand />
    </>
  );
}

/** Everything on Home reads one set of listings, the same data Discover, Calendar and Saved use. */
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

  return (
    <div className="mt-7 space-y-12 sm:mt-9 sm:space-y-14">
      <Categories counts={counts} />

      <section className="container-page" aria-labelledby="recommended-title">
        <RowHeading id="recommended-title" title="Recommended for you" subtitle="Handpicked experiences based on your tastes." href="/discover?sort=recommended" />
        {recs ? (
          recs.length ? (
            <Carousel label="Recommended for you">
              {recs.map((r) => (
                <CarouselItem key={r.listing.id}>
                  <ExperienceCard listing={r.listing} saved={saved.has(r.listing.id)} reason={`Why: ${r.reasons.slice(0, 2).join(" · ")}`} />
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
              {starterRow(upcoming).map((l) => (
                <CarouselItem key={l.id}>
                  <ExperienceCard listing={l} saved={saved.has(l.id)} />
                </CarouselItem>
              ))}
            </Carousel>
          </>
        )}
      </section>

      <HomeRow
        id="popular"
        title="Popular in NYC"
        subtitle="See what everyone's loving."
        note="Ranked by saves. Counts on sample listings come from simulated demo guests."
        href="/discover?sort=popular"
        items={popular}
        saved={saved}
        badge={(_, i) => `#${i + 1}`}
      />

      <HomeRow
        id="area"
        title={area.title}
        subtitle={area.borough ? "Discover something special near you." : "Discover something special across the five boroughs."}
        href={area.href}
        items={area.items}
        saved={saved}
      />

      <HomeRow
        id="featured"
        title="Featured experiences"
        subtitle="Special experiences selected by Tastable."
        href="/discover?collection=featured"
        items={featured}
        saved={saved}
        badge={() => "Featured"}
      />
    </div>
  );
}

function RowHeading({ id, title, subtitle, note, href, as: Tag = "h2" }: { id: string; title: string; subtitle: string; note?: string; href: string; as?: "h1" | "h2" }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4 sm:mb-5">
      <div className="min-w-0">
        <Tag id={id} className="text-[1.3rem] leading-tight sm:text-[1.6rem]">
          {title}
        </Tag>
        <p className="mt-1 text-sm text-muted-foreground">
          {subtitle}
          {note && <span className="block text-xs sm:inline sm:before:content-['_·_']">{note}</span>}
        </p>
      </div>
      <Link
        href={href}
        aria-label={`See all: ${title}`}
        className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-foreground underline-offset-4 hover:underline"
      >
        See all
        <ArrowRight className="size-4 transition-transform duration-300 ease-soft group-hover:translate-x-0.5" aria-hidden />
      </Link>
    </div>
  );
}

function HomeRow({
  id,
  title,
  subtitle,
  note,
  href,
  items,
  saved,
  badge,
}: {
  id: string;
  title: string;
  subtitle: string;
  note?: string;
  href: string;
  items: ListingMatch[];
  saved: Set<string>;
  badge?: (l: ListingMatch, i: number) => string | undefined;
}) {
  if (!items.length) return null;
  return (
    <section className="container-page" aria-labelledby={`${id}-title`}>
      <RowHeading id={`${id}-title`} title={title} subtitle={subtitle} note={note} href={href} />
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
    <div className="mb-4 flex flex-col items-start gap-3 rounded-2xl border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-center gap-3 text-sm text-muted-foreground">
        <Sparkles className="size-4 shrink-0 text-brand" aria-hidden />
        Tell us your neighborhood, budget, when you go out and what you love to eat, and this row becomes yours.
      </p>
      <Button asChild variant="default" size="sm">
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
      <RowHeading
        id="categories-title"
        as="h1"
        title="What are you in the mood for?"
        subtitle="Four ways into New York's food scene."
        href="/discover"
      />
      <ul className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 sm:scroll-px-6 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-4 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          const photo = PHOTOS[c.photo as PhotoKey];
          const n = counts[c.id] ?? 0;
          return (
            <li key={c.id} className="w-[64%] shrink-0 snap-start sm:w-[36%] lg:w-auto">
              <Link
                href={`/discover?category=${c.slug}`}
                aria-label={`${c.name}: ${n} available ${n === 1 ? "experience" : "experiences"}`}
                className="group relative isolate flex aspect-[16/10] flex-col justify-end overflow-hidden rounded-2xl p-3.5 text-white shadow-soft transition-shadow duration-300 hover:shadow-lift focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none sm:aspect-[16/10] sm:p-4"
              >
                <Photo
                  src={photo.src}
                  alt=""
                  theme="charcoal"
                  sizes="(min-width: 1024px) 25vw, 45vw"
                  className="absolute inset-0 -z-10"
                  imageClassName="group-hover:scale-[1.04]"
                />
                <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/35 to-black/5" />
                <span className="absolute top-2.5 right-2.5 rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
                  {n} available
                </span>
                <Icon className="mb-2 size-4.5 text-white/90" strokeWidth={1.5} aria-hidden />
                <span className="font-display text-base leading-tight sm:text-lg">{c.shortName}</span>
                <span className="mt-1 line-clamp-2 text-[13px] leading-snug text-white/80">{c.description}</span>
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
    <section className="container-page mt-16 sm:mt-20" aria-labelledby="host-band-title">
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
    <div className="container-page mt-7 sm:mt-9" aria-busy="true" aria-label="Loading your Home page">
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
