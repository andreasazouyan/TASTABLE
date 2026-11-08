import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BadgeCheck, CalendarClock, Check, Clock, KeyRound, Leaf, MapPin, ShieldCheck, Sparkles, Users } from "lucide-react";

import { FollowButton } from "@/components/experiences/follow-button";
import { EventMenu, menuHeading, type MenuView } from "@/components/experiences/event-menu";
import { ExperienceTimeline } from "@/components/experiences/experience-timeline";
import { HostRating } from "@/components/experiences/host-rating";
import { sectionsFromLegacyMenu } from "@/lib/domain/event-content";
import { SaveButton } from "@/components/experiences/save-button";
import { parseReviewSort, ReviewList, ReviewSortLinks, ReviewSummary } from "@/components/reviews/review-list";
import { getAspectAverages, getExperienceRating, getHostRating, getPublicReviews } from "@/server/queries/reviews";
import { SessionPicker, type PickerSession } from "@/components/experiences/session-picker";
import { ShareButton } from "@/components/experiences/share-button";
import { Photo } from "@/components/site/photo";
import { SampleBadge } from "@/components/site/sample-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth/demo";
import { availability, seatsLeft } from "@/lib/booking/capacity";
import { sessionUnitPrice } from "@/lib/booking/pricing";
import { describeTerms, STANDARD_LATE_FEE_TERMS } from "@/lib/booking/cancellation";
import { getCategory } from "@/lib/domain/categories";
import { menuItemSchema, parseJson, parseList, stringItem } from "@/lib/domain/lists";
import { ATMOSPHERES, cuisineLabel, dietaryLabel, FORMATS, HOST_TYPES, occasionLabel } from "@/lib/domain/taxonomy";
import { formatCompact, formatDate, formatDuration, formatPrice, formatTime } from "@/lib/format";
import { requestNow } from "@/lib/request-clock";
import { db } from "@/lib/db";
import { getExperienceDetail } from "@/server/queries/listings";
import { ReginaResetPanel } from "@/components/booking/regina-reset-panel";
import { demoToolsEnabled, isReginasTable, REGINA_MAX_SEATS, REGINA_PRICE_NOTE } from "@/lib/domain/reginas-table";
import { findReginaReservation } from "@/server/services/reginas-table";

export default function ExperiencePage(props: PageProps<"/experiences/[slug]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <Detail {...props} />
    </Suspense>
  );
}

function Section({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section className="border-t py-8 first:border-t-0 first:pt-0" aria-labelledby={id}>
      <h2 id={id} className="mb-4 text-2xl">
        {title}
      </h2>
      {children}
    </section>
  );
}

async function Detail({ params, searchParams }: PageProps<"/experiences/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const now = await requestNow();
  const [exp, user] = await Promise.all([getExperienceDetail(slug), getCurrentUser()]);
  if (!exp) notFound();

  const guestId = user?.guestProfile?.id;
  const [saved, waitlisted, hostRating] = await Promise.all([
    guestId ? db.savedExperience.findUnique({ where: { guestId_experienceId: { guestId, experienceId: exp.id } } }) : null,
    guestId
      ? db.waitlistEntry.findMany({ where: { guestId, status: { in: ["WAITING", "NOTIFIED"] }, session: { experienceId: exp.id } }, select: { sessionId: true } })
      : [],
    getHostRating(exp.hostId),
  ]);
  const reviewSort = parseReviewSort(sp.reviews);
  const [eventRating, eventAspects, eventReviews] = await Promise.all([
    getExperienceRating(exp.id),
    getAspectAverages({ experienceId: exp.id }),
    getPublicReviews({ experienceId: exp.id }, reviewSort, 20, guestId),
  ]);
  const waitlistedIds = new Set(waitlisted.map((w) => w.sessionId));
  // Regina's event: free (1 seat up to the seats left), with its own guest list.
  const regina = isReginasTable(exp.slug);
  const reginaReservation = regina && guestId ? await findReginaReservation(db, guestId) : null;
  const following = (user?.guestProfile?.preferences?.followedHosts ?? "").split(",").includes(exp.host.slug);

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
  const occasions = parseList(exp.occasions);
  const credentials = exp.host.credentials.split("\n").filter(Boolean);
  const upcoming = exp.sessions.filter((s) => s.startsAt > now);
  const pickerSessions: PickerSession[] = upcoming.map((s) => ({
    id: s.id,
    dateLabel: formatDate(s.startsAt, { weekday: "long", month: "long", day: "numeric" }),
    timeLabel: `${formatTime(s.startsAt)} – ${formatTime(s.endsAt)}`,
    priceLabel: formatPrice(sessionUnitPrice(s, exp)),
    unitPriceCents: sessionUnitPrice(s, exp),
    seatsLeft: seatsLeft(s),
    availability: availability(s, now),
    waitlisted: waitlistedIds.has(s.id),
  }));
  const fromPrice = Math.min(exp.ticketPriceCents, ...upcoming.map((s) => sessionUnitPrice(s, exp)));
  const atmosphere = ATMOSPHERES[exp.socialAtmosphere];
  const sessionParam = typeof sp.session === "string" ? sp.session : undefined;
  const timelineSession = upcoming.find((x) => x.id === sessionParam && x.status !== "CANCELLED") ?? upcoming.find((x) => x.status !== "CANCELLED");
  const path = `/experiences/${exp.slug}`;
  const photos = exp.photos.length ? exp.photos : [{ id: "none", url: "", alt: exp.title }];

  return (
    <article className="container-page pt-6 sm:pt-10">
      <nav aria-label="Breadcrumb" className="mb-5 text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/discover" className="hover:text-foreground">
              Discover
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href={`/discover?category=${category.slug}`} className="hover:text-foreground">
              {category.shortName}
            </Link>
          </li>
        </ol>
      </nav>

      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="eyebrow">{category.name}</span>
            {exp.isFictional && <SampleBadge variant="outline" />}
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
        </div>
        <div className="flex flex-wrap gap-2">
          <SaveButton experienceId={exp.id} saved={!!saved} saveCount={exp.saveCount} title={exp.title} variant="inline" />
          <ShareButton url={path} title={exp.title} text={exp.summary} />
        </div>
      </header>

      {/* Gallery */}
      <div className="grid gap-2 sm:grid-cols-4 sm:grid-rows-2 sm:gap-3">
        {photos.slice(0, 3).map((p, i) => (
          <Photo
            key={p.id}
            src={p.url || null}
            alt={p.alt}
            theme={["terracotta", "sand", "olive"][i]}
            priority={i === 0}
            sizes={i === 0 ? "(min-width: 640px) 50vw, 100vw" : "25vw"}
            className={i === 0 ? "aspect-[4/3] rounded-2xl sm:col-span-2 sm:row-span-2 sm:aspect-auto sm:min-h-[26rem]" : "hidden rounded-2xl sm:col-span-2 sm:block lg:col-span-2"}
          />
        ))}
      </div>
      {photos.length > 1 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {exp.isFictional ? "Illustrative photography. Photos do not depict this fictional host or event." : "Illustrative photography."}
        </p>
      )}

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_24rem]">
        <div>
          <Section title="Why it's worth it" id="usp">
            <ul className="grid gap-3 sm:grid-cols-3">
              {highlights.map((h) => (
                <li key={h} className="flex gap-3 rounded-xl bg-card p-4 shadow-soft">
                  <Sparkles className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                  <span className="text-sm">{h}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 whitespace-pre-line text-[15px] leading-relaxed text-foreground/85">{exp.description}</p>
          </Section>

          <Section title={menuHeading(exp.category)} id="menu">
            <EventMenu menu={menuView} />
          </Section>

          {exp.itinerary.length > 0 && (
            <Section title="Your Experience" id="itinerary">
              <ExperienceTimeline steps={exp.itinerary} startsAt={timelineSession?.startsAt ?? null} />
            </Section>
          )}

          <Section title="What's included" id="included">
            <ul className="grid gap-2 sm:grid-cols-2">
              {inclusions.map((x) => (
                <li key={x} className="flex items-center gap-2 text-sm">
                  <Check className="size-4 text-brand" aria-hidden /> {x}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Good to know" id="good-to-know">
            <dl className="grid gap-6 sm:grid-cols-2">
              <div>
                <dt className="mb-1.5 flex items-center gap-2 font-medium">
                  <Leaf className="size-4 text-brand" aria-hidden /> Dietary accommodations
                </dt>
                <dd className="text-sm text-muted-foreground">
                  {dietary.length ? `${dietary.map(dietaryLabel).join(", ")}.` : "Contact the host about dietary needs."} You can add requirements at checkout.
                </dd>
              </div>
              <div>
                <dt className="mb-1.5 flex items-center gap-2 font-medium">
                  <Users className="size-4 text-brand" aria-hidden /> Group size and atmosphere
                </dt>
                <dd className="text-sm text-muted-foreground">
                  Up to {exp.defaultCapacity} guests · {FORMATS[exp.format]}. {atmosphere.label}: {atmosphere.hint.toLowerCase()}.
                </dd>
              </div>
              <div>
                <dt className="mb-1.5 flex items-center gap-2 font-medium">
                  <CalendarClock className="size-4 text-brand" aria-hidden /> Duration
                </dt>
                <dd className="text-sm text-muted-foreground">{formatDuration(exp.durationMinutes)}. Please arrive 10 minutes early.</dd>
              </div>
              <div>
                <dt className="mb-1.5 font-medium">Great for</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {occasions.map((o) => (
                    <Link key={o} href={`/discover?occasion=${o}`} className="rounded-full bg-muted px-2.5 py-1 text-xs hover:bg-secondary">
                      {occasionLabel(o)}
                    </Link>
                  ))}
                </dd>
              </div>
            </dl>
          </Section>

          <Section title="The venue" id="venue">
            <div className="rounded-2xl border bg-card p-5">
              <p className="font-display text-lg">{exp.venue.isSecretLocation ? "Secret location" : exp.venue.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {exp.venue.neighborhood}, {exp.venue.borough}
                {exp.venue.isFictional && ` · ${exp.venue.type.replaceAll("_", " ").toLowerCase()}`}
              </p>
              {exp.venue.isSecretLocation ? (
                <p className="mt-3 flex items-start gap-2 text-sm">
                  <KeyRound className="mt-0.5 size-4 text-brand" aria-hidden /> The exact address is shared with ticket holders 24 hours before.
                </p>
              ) : exp.venue.isFictional ? (
                <p className="mt-3 text-sm">Address shown on your ticket after booking.</p>
              ) : (
                <p className="mt-3 flex items-start gap-2 text-sm">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden /> {exp.venue.addressLine}
                </p>
              )}
              {exp.venue.accessibilityNotes && <p className="mt-2 text-sm text-muted-foreground">Access: {exp.venue.accessibilityNotes}</p>}
            </div>
          </Section>

          <Section title="Your host" id="host">
            <div className="flex flex-col gap-5 sm:flex-row">
              <Link href={`/hosts/${exp.host.slug}`} aria-hidden tabIndex={-1} className="shrink-0">
                {exp.host.profilePhotoUrl ? (
                  <Photo src={exp.host.profilePhotoUrl} alt="" theme="terracotta" sizes="64px" className="size-16 rounded-full" />
                ) : (
                  <span className="grid size-16 place-items-center rounded-full bg-brand-soft font-display text-2xl text-accent-foreground">{exp.host.displayName[0]}</span>
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="flex items-center gap-1.5 font-display text-xl">
                    <Link href={`/hosts/${exp.host.slug}`} className="underline-offset-4 hover:underline">
                      {exp.host.displayName}
                    </Link>
                    {exp.host.verified && <BadgeCheck className="size-5 text-brand" aria-label="Verified host (demo)" />}
                  </p>
                  <FollowButton hostSlug={exp.host.slug} hostName={exp.host.displayName} following={following} />
                </div>
                <HostRating rating={hostRating} size="md" className="mt-1" />
                <p className="mt-1 text-sm text-muted-foreground">
                  {HOST_TYPES[exp.host.hostType].label} · {exp.host.tagline}
                  {exp.host.followerCount > 0 && ` · ${formatCompact(exp.host.followerCount)} followers (fictional)`}
                </p>
                <p className="mt-3 text-[15px]">{exp.host.background}.</p>
                <p className="mt-2 text-sm text-muted-foreground">{exp.host.bio}</p>
                {credentials.length > 0 && (
                  <ul className="mt-4 space-y-1.5" aria-label="Credentials">
                    {credentials.map((c) => (
                      <li key={c} className="flex items-center gap-2 text-sm">
                        <ShieldCheck className="size-4 text-brand" aria-hidden /> {c}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Section>

          <Section title="Reviews" id="reviews">
            <ReviewSummary rating={eventRating} aspects={eventAspects} />
            {eventReviews.length > 1 && (
              <div className="mt-5 flex justify-end">
                <ReviewSortLinks current={reviewSort} hrefFor={(s) => `${path}?${new URLSearchParams({ ...(sessionParam ? { session: sessionParam } : {}), ...(s === "recent" ? {} : { reviews: s }) })}#reviews`} />
              </div>
            )}
            {eventReviews.length > 0 && <ReviewList reviews={eventReviews} signedIn={!!user} />}
            <p className="mt-3 text-sm">
              <Link href={`/hosts/${exp.host.slug}#reviews`} className="font-medium underline-offset-4 hover:underline">
                All reviews for {exp.host.displayName}
              </Link>
            </p>
          </Section>

          <Section title="Cancellation policy" id="policy">
            {/* New bookings use Tastable's standard terms; earlier bookings keep the terms they accepted. */}
            <p className="mb-3 font-medium">{STANDARD_LATE_FEE_TERMS.name}</p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {describeTerms(STANDARD_LATE_FEE_TERMS).map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">You&apos;ll see the exact fee and refund before confirming any cancellation.</p>
          </Section>
        </div>

        <aside aria-label="Book this experience" className="lg:relative">
          <div className="rounded-2xl border bg-card p-5 shadow-lift lg:sticky lg:top-24 sm:p-6">
            {regina ? (
              <div className="mb-5">
                <p>
                  <span className="font-display text-3xl">{formatPrice(fromPrice)}</span>
                  <span className="text-sm text-muted-foreground"> / guest</span>
                </p>
                <p className="mt-1 text-sm font-medium text-accent-foreground" data-testid="price-note">
                  {REGINA_PRICE_NOTE}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">One-time only</p>
              </div>
            ) : (
              <p className="mb-5">
                <span className="text-sm text-muted-foreground">From </span>
                <span className="font-display text-3xl">{formatPrice(fromPrice)}</span>
                <span className="text-sm text-muted-foreground"> / person</span>
              </p>
            )}
            {reginaReservation ? (
              <div className="rounded-xl bg-[#e5eddc] p-4 text-sm text-[#2f3d24]" role="status">
                <p className="font-medium">You&apos;re on the guest list.</p>
                <Link href={`/bookings/${reginaReservation.reference}`} className="mt-1 inline-block font-medium underline underline-offset-4">
                  See your reservation
                </Link>
              </div>
            ) : regina ? (
              <SessionPicker slug={exp.slug} sessions={pickerSessions} initialId={sessionParam} path={path} seatNoun="seat" maxSeats={REGINA_MAX_SEATS} bookSuffix=" — Free" />
            ) : (
              <SessionPicker slug={exp.slug} sessions={pickerSessions} initialId={sessionParam} path={path} />
            )}
          </div>
          {regina && demoToolsEnabled() && <ReginaResetPanel className="mt-4" />}
        </aside>
      </div>
    </article>
  );
}

function DetailSkeleton() {
  return (
    <div className="container-page pt-10" aria-busy="true" aria-label="Loading experience">
      <Skeleton className="mb-4 h-4 w-40" />
      <Skeleton className="mb-3 h-12 w-2/3" />
      <Skeleton className="mb-8 h-5 w-1/2" />
      <Skeleton className="aspect-[16/7] rounded-2xl" />
      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  );
}
