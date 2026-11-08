import Link from "next/link";
import { BadgeCheck, MapPin } from "lucide-react";

import { AvailabilityPill } from "@/components/experiences/availability";
import { HostRating } from "@/components/experiences/host-rating";
import { SaveButton } from "@/components/experiences/save-button";
import { Photo } from "@/components/site/photo";
import { SampleBadge } from "@/components/site/sample-badge";
import { getCategory } from "@/lib/domain/categories";
import { isReginasTable } from "@/lib/domain/reginas-table";
import type { ListingMatch } from "@/lib/discovery/types";
import { formatDateTime, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ExperienceCategory } from "@/generated/prisma/enums";

export type CardListing = Pick<
  ListingMatch,
  "id" | "slug" | "title" | "category" | "tags" | "host" | "venue" | "photo" | "coverTheme" | "isFictional" | "ticketPriceCents"
> & Partial<Pick<ListingMatch, "saves" | "hostRating">> & { matched: ListingMatch["matched"]; matchedCount?: number; distance?: number | null };

/**
 * Event card: photo, title, host, date, neighborhood, price, available spots and tags.
 * The whole card is one link; the save button sits above it in the stacking order.
 */
export function ExperienceCard({
  listing,
  saved = false,
  reason,
  priority = false,
  className,
  basePath = "/experiences",
  showSave = true,
  linkHost = true,
}: {
  listing: CardListing;
  saved?: boolean;
  /** Optional explanation, e.g. for "Recommended for You". */
  reason?: string;
  priority?: boolean;
  className?: string;
  /** Where the card links to; the host Explore tab uses /host/explore so hosts stay in their account. */
  basePath?: string;
  /** Saving is a guest feature; hidden when hosts browse. */
  showSave?: boolean;
  /** Link the host name to the public host profile (guest pages only). */
  linkHost?: boolean;
}) {
  const category = getCategory(listing.category as ExperienceCategory);
  const session = listing.matched;
  const more = (listing.matchedCount ?? 0) - 1;
  const href = session ? `${basePath}/${listing.slug}?session=${session.id}` : `${basePath}/${listing.slug}`;

  return (
    <article className={cn("group relative flex flex-col", className)}>
      <div className="relative">
        <Photo
          src={listing.photo?.url}
          alt={listing.photo?.alt ?? listing.title}
          theme={listing.coverTheme}
          priority={priority}
          sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 85vw"
          className="aspect-[4/3] rounded-2xl"
          imageClassName="group-hover:scale-[1.03]"
        />
        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">{listing.isFictional && <SampleBadge />}</div>
        </div>
        {showSave && (
          <SaveButton experienceId={listing.id} saved={saved} saveCount={listing.saves ?? 0} title={listing.title} className="absolute top-3 right-3 z-10" />
        )}
        {session && (
          <AvailabilityPill seatsLeft={session.seatsLeft} availability={session.availability} noun={isReginasTable(listing.slug) ? "seat" : "spot"} className="absolute bottom-3 left-3" />
        )}
      </div>

      <div className="flex flex-1 flex-col pt-3.5">
        <p className="text-[11px] font-semibold tracking-[0.12em] text-brand uppercase">{category.shortName}</p>
        <h3 className="mt-1 font-display text-[1.2rem] leading-snug">
          <Link
            href={href}
            className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-[3px] focus-visible:after:ring-ring/40"
          >
            {listing.title}
          </Link>
        </h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          <span className="truncate">
            Hosted by{" "}
            {linkHost ? (
              <Link href={`/hosts/${listing.host.slug}`} className="relative z-10 underline-offset-4 hover:text-foreground hover:underline">
                {listing.host.displayName}
              </Link>
            ) : (
              listing.host.displayName
            )}
          </span>
          {listing.host.verified && <BadgeCheck className="size-3.5 shrink-0 text-brand" aria-label="Verified host" />}
        </p>
        {listing.hostRating && <HostRating rating={listing.hostRating} className="mt-1" />}

        <dl className="mt-2.5 space-y-1 text-sm">
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Date</dt>
            <dd>
              {session ? formatDateTime(session.startsAt) : "No upcoming dates"}
              {more > 0 && <span className="text-muted-foreground"> · +{more} more</span>}
            </dd>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <dt className="sr-only">Neighborhood</dt>
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            <dd className="truncate">
              {listing.venue.neighborhood}
              {typeof listing.distance === "number" && ` · ${listing.distance.toFixed(1)} mi`}
            </dd>
          </div>
        </dl>

        <div className="mt-3 flex items-end justify-between gap-3">
          <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
            {listing.tags.slice(0, 2).map((t) => (
              <li key={t} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                {t}
              </li>
            ))}
          </ul>
          <p className="shrink-0 text-right">
            <span className="font-semibold">{formatPrice(session?.priceCents ?? listing.ticketPriceCents)}</span>
            <span className="text-xs text-muted-foreground"> / person</span>
          </p>
        </div>
        {reason && <p className="mt-3 rounded-lg bg-brand-soft/60 px-3 py-2 text-[13px] text-accent-foreground">{reason}</p>}
      </div>
    </article>
  );
}
