import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, BadgeCheck, Check, Clock, Eye, KeyRound, MapPin, PencilLine, Sparkles, Users } from "lucide-react";

import { AvailabilityPill } from "@/components/experiences/availability";
import { EventMenu, menuHeading, type MenuView } from "@/components/experiences/event-menu";
import { ExperienceTimeline } from "@/components/experiences/experience-timeline";
import { HostRating } from "@/components/experiences/host-rating";
import { ReviewSummary } from "@/components/reviews/review-list";
import { Photo } from "@/components/site/photo";
import { SampleBadge } from "@/components/site/sample-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireHost } from "@/lib/auth/demo";
import { availability, seatsLeft } from "@/lib/booking/capacity";
import { sessionUnitPrice } from "@/lib/booking/pricing";
import { getCategory } from "@/lib/domain/categories";
import { sectionsFromLegacyMenu } from "@/lib/domain/event-content";
import { menuItemSchema, parseJson, parseList, stringItem } from "@/lib/domain/lists";
import { isReginasTable, REGINA_PRICE_NOTE } from "@/lib/domain/reginas-table";
import { ATMOSPHERES, cuisineLabel, dietaryLabel, FORMATS, HOST_TYPES } from "@/lib/domain/taxonomy";
import { formatDate, formatDuration, formatPrice, formatTime } from "@/lib/format";
import { requestNow } from "@/lib/request-clock";
import { getAspectAverages, getExperienceRating, getHostRating } from "@/server/queries/reviews";
import { getExperienceDetail } from "@/server/queries/listings";

export const metadata: Metadata = { title: "Explore" };

/**
 * An event page seen from the host account: the same public content guests see, but read-only
 * (no booking, saving or following) and with navigation that stays inside the host area.
 */
export default function HostExploreDetailPage(props: PageProps<"/host/explore/[slug]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <Detail {...props} />
    </Suspense>
  );
}

function Section({ title, children, id }: { title: string; children: React.ReactNode; id: string }) {
  return (
    <section className="border-t py-8 first:border-t-0 first:pt-0" aria-labelledby={id}>
      <h2 id={id} className="mb-4 text-2xl">
        {title}
      </h2>
      {children}
    </section>
  );
}

async function Detail({ params, searchParams }: PageProps<"/host/explore/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const [{ host }, now, exp] = await Promise.all([requireHost(`/host/explore/${slug}`), requestNow(), getExperienceDetail(slug)]);
  if (!exp) notFound();

  const [hostRating, eventRating, eventAspects] = await Promise.all([
    getHostRating(exp.hostId),
    getExperienceRating(exp.id),
    getAspectAverages({ experienceId: exp.id }),
  ]);

  const mine = exp.hostId === host.id;
  const regina = isReginasTable(exp.slug);
  const category = getCategory(exp.category);
  const highlights = parseJson(exp.highlights, stringItem);
  const menuView: MenuView = {
    status: exp.menuStatus,
    sections: exp.menuSections.length
      ? exp.menuSections.map((sec) => ({ title: sec.title, description: sec.description, items: sec.items.map((it) => ({ ...it, dietaryTags: parseList(it.dietaryTags) })) }))
      : sectionsFromLegacyMenu(parseJson(exp.menu, menuItemSchema)),
  };
  const inclusions = parseJson(exp.inclusions, stringItem);
  const dietary = parseList(exp.dietaryOptions);
  const upcoming = exp.sessions.filter((s) => s.startsAt > now);
  const fromPrice = Math.min(exp.ticketPriceCents, ...upcoming.map((s) => sessionUnitPrice(s, exp)));
  const sessionParam = typeof sp.session === "string" ? sp.session : undefined;
  const timelineSession = upcoming.find((x) => x.id === sessionParam && x.status !== "CANCELLED") ?? upcoming.find((x) => x.status !== "CANCELLED");
  const atmosphere = ATMOSPHERES[exp.socialAtmosphere];
  const photos = exp.photos.length ? exp.photos : [{ id: "none", url: "", alt: exp.title }];

  return (
    <article>
      <nav aria-label="Breadcrumb" className="mb-5 text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/host/explore" className="inline-flex items-center gap-1 hover:text-foreground">
              <ArrowLeft className="size-3.5" aria-hidden /> Explore
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href={`/host/explore?category=${category.slug}`} className="hover:text-foreground">
              {category.shortName}
            </Link>
          </li>
        </ol>
      </nav>

      <header className="mb-6 max-w-3xl">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="eyebrow">{category.name}</span>
          {exp.isFictional && <SampleBadge variant="outline" />}
          {mine && <span className="rounded-full bg-foreground px-2.5 py-0.5 text-[11px] font-semibold text-background">Your event</span>}
        </div>
        <h1 className="text-4xl leading-[1.05] sm:text-5xl">{exp.title}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{exp.summary}</p>
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="flex items-center gap-1.5">
            <MapPin className="size-4 text-brand" aria-hidden /> {exp.venue.neighborhood}, {exp.venue.borough}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="size-4 text-brand" aria-hidden /> {formatDuration(exp.durationMinutes)}
          </span>
          <span>{cuisineLabel(exp.cuisine)}</span>
        </p>
      </header>

      <div className="grid gap-2 sm:grid-cols-4 sm:grid-rows-2 sm:gap-3">
        {photos.slice(0, 3).map((p, i) => (
          <Photo
            key={p.id}
            src={p.url || null}
            alt={p.alt}
            theme={["terracotta", "sand", "olive"][i]}
            priority={i === 0}
            sizes={i === 0 ? "(min-width: 640px) 50vw, 100vw" : "25vw"}
            className={i === 0 ? "aspect-[4/3] rounded-2xl sm:col-span-2 sm:row-span-2 sm:aspect-auto sm:min-h-[24rem]" : "hidden rounded-2xl sm:col-span-2 sm:block"}
          />
        ))}
      </div>

      <div className="mt-10 grid gap-12 xl:grid-cols-[1fr_22rem]">
        <div>
          <Section title="Why it's worth it" id="usp">
            {highlights.length > 0 && (
              <ul className="grid gap-3 sm:grid-cols-3">
                {highlights.map((h) => (
                  <li key={h} className="flex gap-3 rounded-xl bg-card p-4 shadow-soft">
                    <Sparkles className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                    <span className="text-sm">{h}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-6 text-[15px] leading-relaxed text-foreground/85">{exp.description}</p>
          </Section>

          <Section title={menuHeading(exp.category)} id="menu">
            <EventMenu menu={menuView} />
          </Section>

          {exp.itinerary.length > 0 && (
            <Section title="The experience" id="itinerary">
              <ExperienceTimeline steps={exp.itinerary} startsAt={timelineSession?.startsAt ?? null} />
            </Section>
          )}

          {inclusions.length > 0 && (
            <Section title="What's included" id="included">
              <ul className="grid gap-2 sm:grid-cols-2">
                {inclusions.map((x) => (
                  <li key={x} className="flex items-center gap-2 text-sm">
                    <Check className="size-4 text-brand" aria-hidden /> {x}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title="Format and venue" id="venue">
            <dl className="grid gap-6 sm:grid-cols-2">
              <div>
                <dt className="mb-1.5 flex items-center gap-2 font-medium">
                  <Users className="size-4 text-brand" aria-hidden /> Group size and atmosphere
                </dt>
                <dd className="text-sm text-muted-foreground">
                  Up to {exp.defaultCapacity} guests · {FORMATS[exp.format]}. {atmosphere.label}.
                </dd>
              </div>
              <div>
                <dt className="mb-1.5 font-medium">Dietary accommodations</dt>
                <dd className="text-sm text-muted-foreground">{dietary.length ? `${dietary.map(dietaryLabel).join(", ")}.` : "Not specified."}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="mb-1.5 font-medium">{exp.venue.isSecretLocation ? "Secret location" : exp.venue.name}</dt>
                <dd className="text-sm text-muted-foreground">
                  {exp.venue.neighborhood}, {exp.venue.borough}
                  {exp.venue.isSecretLocation ? (
                    <span className="mt-1 flex items-center gap-2">
                      <KeyRound className="size-4 text-brand" aria-hidden /> Address shared with ticket holders 24 hours before.
                    </span>
                  ) : (
                    !exp.venue.isFictional && <span className="mt-1 block">{exp.venue.addressLine}</span>
                  )}
                </dd>
              </div>
            </dl>
          </Section>

          <Section title="Host" id="host">
            <p className="flex items-center gap-1.5 font-display text-xl">
              {exp.host.displayName}
              {exp.host.verified && <BadgeCheck className="size-5 text-brand" aria-label="Verified host (demo)" />}
            </p>
            <HostRating rating={hostRating} size="md" className="mt-1" />
            <p className="mt-1 text-sm text-muted-foreground">
              {HOST_TYPES[exp.host.hostType].label} · {exp.host.tagline}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">{exp.host.bio}</p>
          </Section>

          <Section title="Reviews" id="reviews">
            <ReviewSummary rating={eventRating} aspects={eventAspects} />
          </Section>
        </div>

        <aside aria-label="Dates and availability" className="xl:relative">
          <div className="rounded-2xl border bg-card p-5 shadow-lift sm:p-6 xl:sticky xl:top-24">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <Eye className="size-3.5" aria-hidden /> Viewing as host
            </p>
            <p className="mb-1">
              {!regina && <span className="text-sm text-muted-foreground">From </span>}
              <span className="font-display text-3xl">{formatPrice(fromPrice)}</span>
              <span className="text-sm text-muted-foreground"> / {regina ? "guest" : "person"}</span>
            </p>
            {regina && <p className="text-sm font-medium text-accent-foreground">{REGINA_PRICE_NOTE}</p>}

            <h2 className="mt-5 mb-2 font-sans text-sm font-semibold">Upcoming dates</h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming dates.</p>
            ) : (
              <ul className="divide-y text-sm">
                {upcoming.slice(0, 8).map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span>
                      <span className="block font-medium">{formatDate(s.startsAt, { weekday: "short", month: "short", day: "numeric" })}</span>
                      <span className="text-muted-foreground">
                        {formatTime(s.startsAt)} – {formatTime(s.endsAt)} · {formatPrice(sessionUnitPrice(s, exp))}
                      </span>
                    </span>
                    <AvailabilityPill seatsLeft={seatsLeft(s)} availability={availability(s, now)} noun={regina ? "seat" : "spot"} className="shrink-0 shadow-none" />
                  </li>
                ))}
              </ul>
            )}
            {upcoming.length > 8 && <p className="mt-1 text-xs text-muted-foreground">+{upcoming.length - 8} more dates</p>}

            <div className="mt-5 flex flex-col gap-2">
              {mine ? (
                <Button asChild>
                  <Link href={`/host/events/${exp.id}/edit`}>
                    <PencilLine aria-hidden /> Edit your event
                  </Link>
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">Booking is for guests. You&apos;re browsing from your host account, so nothing here changes your events.</p>
              )}
              <Button asChild variant="outline">
                <Link href="/host/explore">Back to Explore</Link>
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </article>
  );
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading experience">
      <Skeleton className="mb-4 h-4 w-40" />
      <Skeleton className="mb-3 h-12 w-2/3" />
      <Skeleton className="mb-8 h-5 w-1/2" />
      <Skeleton className="aspect-[16/7] rounded-2xl" />
    </div>
  );
}
