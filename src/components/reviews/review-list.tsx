import Link from "next/link";
import { BadgeCheck, Star } from "lucide-react";

import { HostRating } from "@/components/experiences/host-rating";
import { ReportReview } from "@/components/reviews/report-review";
import { formatDate } from "@/lib/format";
import { REVIEW_SORTS, type RatingSummary, type ReviewSort } from "@/lib/reviews";
import { cn } from "@/lib/utils";
import type { PublicReview } from "@/server/queries/reviews";

function Stars({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex" role="img" aria-label={label}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={cn("size-3.5", i < value ? "fill-brand text-brand" : "text-brand/30")} aria-hidden />
      ))}
    </span>
  );
}

type Aspect = { key: string; label: string; value: { average: number; count: number } | null };

/** Average, star distribution and aspect averages. Verified reviews only (same calculation everywhere). */
export function ReviewSummary({ rating, aspects }: { rating: RatingSummary; aspects?: Aspect[] }) {
  if (!rating.count) {
    return (
      <div className="rounded-2xl border border-dashed p-5">
        <HostRating rating={rating} size="md" />
        <p className="mt-2 text-sm text-muted-foreground">No reviews yet. Only guests whose attendance was verified at check-in can leave one.</p>
      </div>
    );
  }
  const max = Math.max(...rating.distribution);
  const shownAspects = (aspects ?? []).filter((a) => a.value);
  return (
    <div className="grid gap-6 rounded-2xl border bg-card p-5 sm:grid-cols-[auto_1fr]">
      <div>
        <p className="font-display text-5xl leading-none">{rating.average!.toFixed(1)}</p>
        <HostRating rating={rating} size="md" className="mt-2" />
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <BadgeCheck className="size-3.5 text-brand" aria-hidden /> Verified attendance only
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <ul className="space-y-1" aria-label="Rating distribution">
          {[5, 4, 3, 2, 1].map((n) => (
            <li key={n} className="flex items-center gap-2 text-xs">
              <span className="w-10 tabular-nums">{n} star</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <span className="block h-full rounded-full bg-brand" style={{ width: `${max ? (rating.distribution[n - 1] / max) * 100 : 0}%` }} />
              </span>
              <span className="w-6 text-right text-muted-foreground tabular-nums">{rating.distribution[n - 1]}</span>
            </li>
          ))}
        </ul>
        {shownAspects.length > 0 && (
          <dl className="space-y-1 text-sm">
            {shownAspects.map((a) => (
              <div key={a.key} className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">{a.label}</dt>
                <dd className="tabular-nums">
                  {a.value!.average.toFixed(1)} <span className="text-xs text-muted-foreground">({a.value!.count})</span>
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}

/** Sort links (server-rendered, so they work without JavaScript). */
export function ReviewSortLinks({ current, hrefFor }: { current: ReviewSort; hrefFor: (s: ReviewSort) => string }) {
  return (
    <nav aria-label="Sort reviews" className="flex flex-wrap gap-1 rounded-full bg-muted p-1 text-sm">
      {REVIEW_SORTS.map((s) => (
        <Link
          key={s.key}
          href={hrefFor(s.key)}
          scroll={false}
          aria-current={current === s.key ? "true" : undefined}
          className={cn("rounded-full px-3 py-1.5", current === s.key ? "bg-card font-medium shadow-soft" : "text-muted-foreground hover:text-foreground")}
        >
          {s.label}
        </Link>
      ))}
    </nav>
  );
}

const ASPECTS = [
  ["foodRating", "Food"],
  ["atmosphereRating", "Atmosphere"],
  ["organizationRating", "Organization"],
  ["valueRating", "Value"],
] as const;

export function ReviewList({ reviews, showEvent, signedIn }: { reviews: PublicReview[]; showEvent?: boolean; signedIn: boolean }) {
  return (
    <ul className="divide-y" aria-label="Reviews">
      {reviews.map((r) => (
        <li key={r.id} className="py-5">
          <article aria-label={`Review by ${r.reviewerFirstName}`}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Stars value={r.rating} label={`${r.rating} out of 5 stars`} />
              <span className="font-medium">{r.reviewerFirstName}</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <BadgeCheck className="size-3.5 text-brand" aria-hidden /> Verified attendance · attended {formatDate(r.session.startsAt, { month: "short", year: "numeric" })}
              </span>
            </div>
            {showEvent && (
              <p className="mt-1 text-sm">
                <Link href={`/experiences/${r.experience.slug}`} className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                  {r.experience.title}
                </Link>
              </p>
            )}
            <p className="mt-2 text-[15px] leading-relaxed">{r.body}</p>
            {ASPECTS.some(([k]) => r[k]) && (
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Detailed ratings">
                {ASPECTS.filter(([k]) => r[k]).map(([k, label]) => (
                  <li key={k}>
                    {label} {r[k]}/5
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>
                {formatDate(r.createdAt, { month: "short", day: "numeric", year: "numeric" })}
                {r.editedAt && " · edited"}
              </span>
              {r.isOwn ? <span>Your review</span> : <ReportReview reviewId={r.id} signedIn={signedIn} />}
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}

export function parseReviewSort(v: unknown): ReviewSort {
  return v === "highest" || v === "lowest" ? v : "recent";
}
