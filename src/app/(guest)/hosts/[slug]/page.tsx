import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BadgeCheck, MapPin, ShieldCheck } from "lucide-react";

import { ExperienceCard } from "@/components/experiences/experience-card";
import { FollowButton } from "@/components/experiences/follow-button";
import { HostRating } from "@/components/experiences/host-rating";
import { parseReviewSort, ReviewList, ReviewSortLinks, ReviewSummary } from "@/components/reviews/review-list";
import { Photo } from "@/components/site/photo";
import { SampleBadge } from "@/components/site/sample-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth/demo";
import { db } from "@/lib/db";
import { getNeighborhood } from "@/lib/domain/neighborhoods";
import { cuisineLabel, HOST_TYPES } from "@/lib/domain/taxonomy";
import { formatDate } from "@/lib/format";
import { requestNow } from "@/lib/request-clock";
import { getPublicHostProfile } from "@/server/queries/host-profile";
import { snippet } from "@/lib/seo/site";

export async function generateMetadata({ params }: PageProps<"/hosts/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const host = await db.hostProfile.findUnique({
    where: { slug },
    select: { slug: true, displayName: true, tagline: true, bio: true, profilePhotoUrl: true },
  });
  if (!host) return { title: "Host not found", robots: { index: false } };
  const title = `${host.displayName}, food experiences in NYC`;
  const description = snippet(host.tagline || host.bio);
  const url = `/hosts/${host.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "profile",
      title,
      description,
      url,
      images: host.profilePhotoUrl ? [{ url: host.profilePhotoUrl, alt: host.displayName }] : undefined,
    },
  };
}

export default function HostProfilePage(props: PageProps<"/hosts/[slug]">) {
  return (
    <Suspense fallback={<Skeleton className="container-page mt-10 h-[40rem] rounded-2xl" />}>
      <HostProfile {...props} />
    </Suspense>
  );
}

async function HostProfile({ params, searchParams }: PageProps<"/hosts/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const sort = parseReviewSort(sp.sort);
  const [now, user] = await Promise.all([requestNow(), getCurrentUser()]);
  const guestId = user?.guestProfile?.id ?? null;
  const data = await getPublicHostProfile(slug, now, sort, guestId);
  if (!data) notFound();
  const { host, rating, aspects, reviews, upcoming, past } = data;
  const saved = guestId
    ? new Set((await db.savedExperience.findMany({ where: { guestId, experienceId: { in: upcoming.map((u) => u.id) } }, select: { experienceId: true } })).map((s) => s.experienceId))
    : new Set<string>();
  const following = (user?.guestProfile?.preferences?.followedHosts ?? "").split(",").includes(host.slug);
  const hood = host.homeNeighborhood ? getNeighborhood(host.homeNeighborhood)?.name : null;

  return (
    <article className="container-page pt-8 sm:pt-12">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-start">
        {host.profilePhotoUrl ? (
          <Photo src={host.profilePhotoUrl} alt={`${host.displayName}`} theme="terracotta" sizes="128px" className="size-28 shrink-0 rounded-full" />
        ) : (
          <span aria-hidden className="grid size-28 shrink-0 place-items-center rounded-full bg-brand-soft font-display text-5xl text-accent-foreground">
            {host.displayName[0]}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="eyebrow">{HOST_TYPES[host.hostType].label}</span>
            {host.isFictional && <SampleBadge variant="outline" />}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="flex items-center gap-2 text-4xl sm:text-5xl">
              {host.displayName}
              {host.verified && <BadgeCheck className="size-7 text-brand" aria-label="Verified host (demo)" />}
            </h1>
            <FollowButton hostSlug={host.slug} hostName={host.displayName} following={following} />
          </div>
          <p className="mt-2 text-lg text-muted-foreground">{host.tagline}</p>
          <HostRating rating={rating} size="md" className="mt-2" />
          {hood && (
            <p className="mt-2 flex items-center gap-1.5 text-sm">
              <MapPin className="size-4 text-brand" aria-hidden /> Based in {hood}
            </p>
          )}
        </div>
      </header>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-12">
          <section aria-labelledby="about">
            <h2 id="about" className="mb-3 text-2xl">
              About
            </h2>
            <p className="text-[15px]">{host.background}.</p>
            <p className="mt-2 text-[15px] leading-relaxed text-foreground/85">{host.bio}</p>
          </section>

          <section aria-labelledby="upcoming">
            <h2 id="upcoming" className="mb-4 text-2xl">
              Upcoming events
            </h2>
            {upcoming.length ? (
              <ul className="grid gap-6 sm:grid-cols-2">
                {upcoming.map((l) => (
                  <li key={l.id}>
                    <ExperienceCard listing={{ ...l, matched: l.sessions[0] ?? null, matchedCount: l.sessions.length }} saved={saved.has(l.id)} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming dates right now. Follow {host.displayName} to see new events first.</p>
            )}
          </section>

          <section aria-labelledby="reviews">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <h2 id="reviews" className="text-2xl">
                Reviews
              </h2>
              {reviews.length > 1 && <ReviewSortLinks current={sort} hrefFor={(s) => `/hosts/${host.slug}${s === "recent" ? "" : `?sort=${s}`}#reviews`} />}
            </div>
            <ReviewSummary rating={rating} aspects={aspects} />
            {reviews.length > 0 && <ReviewList reviews={reviews} showEvent signedIn={!!user} />}
          </section>
        </div>

        <aside className="space-y-8">
          {host.cuisineExpertise.length > 0 && (
            <section aria-labelledby="expertise">
              <h2 id="expertise" className="mb-3 font-display text-lg">
                Expertise
              </h2>
              <ul className="flex flex-wrap gap-1.5">
                {host.cuisineExpertise.map((c) => (
                  <li key={c} className="rounded-full bg-muted px-2.5 py-1 text-sm">
                    {cuisineLabel(c)}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {host.credentials.length > 0 && (
            <section aria-labelledby="credentials">
              <h2 id="credentials" className="mb-3 font-display text-lg">
                Credentials
              </h2>
              <ul className="space-y-1.5">
                {host.credentials.map((c) => (
                  <li key={c} className="flex items-start gap-2 text-sm">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden /> {c}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">Self-reported by the host.</p>
            </section>
          )}
          <section aria-labelledby="past">
            <h2 id="past" className="mb-3 font-display text-lg">
              Past events
            </h2>
            {past.length ? (
              <ul className="space-y-3">
                {past.map((e) => (
                  <li key={e.id} className="text-sm">
                    {e.status === "PUBLISHED" ? (
                      <Link href={`/experiences/${e.slug}`} className="font-medium underline-offset-4 hover:underline">
                        {e.title}
                      </Link>
                    ) : (
                      <span className="font-medium">{e.title}</span>
                    )}
                    <span className="block text-muted-foreground">{e.sessions.map((s) => formatDate(s.startsAt, { month: "short", day: "numeric", year: "numeric" })).join(" · ")}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No past events yet.</p>
            )}
          </section>
        </aside>
      </div>
    </article>
  );
}
