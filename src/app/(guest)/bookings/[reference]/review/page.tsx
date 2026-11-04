import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BadgeCheck } from "lucide-react";

import { ReviewForm } from "@/components/reviews/review-form";
import { Skeleton } from "@/components/ui/skeleton";
import { requireGuest } from "@/lib/auth/demo";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { requestNow } from "@/lib/request-clock";
import { ELIGIBILITY_MESSAGES, reviewEligibility } from "@/lib/reviews";
import { getBookingByReference } from "@/server/queries/bookings";

export const metadata: Metadata = { title: "Leave a Review" };

export default function ReviewPage(props: PageProps<"/bookings/[reference]/review">) {
  return (
    <div className="container-page max-w-2xl pt-8 sm:pt-12">
      <Suspense fallback={<Skeleton className="h-[30rem] rounded-2xl" />}>
        <Review {...props} />
      </Suspense>
    </div>
  );
}

async function Review({ params }: PageProps<"/bookings/[reference]/review">) {
  const { reference } = await params;
  const { guest } = await requireGuest(`/bookings/${reference}/review`);
  const now = await requestNow();
  // Only the booking owner gets here; anyone else sees "not found".
  const booking = await getBookingByReference(reference, guest.id);
  if (!booking) notFound();
  const e = booking.session.experience;
  const existing = booking.review
    ? await db.review.findUnique({
        where: { id: booking.review.id },
        select: { id: true, rating: true, body: true, foodRating: true, atmosphereRating: true, organizationRating: true, valueRating: true, status: true },
      })
    : null;
  const eligibility = reviewEligibility(booking, now);
  const eventHref = `/experiences/${e.slug}#reviews`;

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-5 text-sm text-muted-foreground">
        <Link href="/bookings?view=past" className="hover:text-foreground">
          My Bookings
        </Link>{" "}
        / {booking.reference}
      </nav>
      <p className="eyebrow mb-2">{existing ? "Edit your review" : "Leave a Review"}</p>
      <h1 className="text-4xl">{e.title}</h1>
      <p className="mt-2 text-muted-foreground">
        Hosted by{" "}
        <Link href={`/hosts/${e.host.slug}`} className="underline-offset-4 hover:underline">
          {e.host.displayName}
        </Link>{" "}
        · attended {formatDate(booking.session.startsAt, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
      </p>
      <p className="mt-3 flex items-center gap-1.5 text-sm">
        <BadgeCheck className="size-4 text-brand" aria-hidden /> Shown as a verified review: your attendance was confirmed at check-in.
      </p>

      <div className="mt-8">
        {existing ? (
          existing.status === "REMOVED" ? (
            <p className="rounded-xl bg-muted p-4 text-sm">This review was removed by moderation and can&apos;t be edited.</p>
          ) : (
            <ReviewForm mode="edit" reviewId={existing.id} initial={existing} eventHref={eventHref} />
          )
        ) : eligibility.eligible ? (
          <ReviewForm mode="create" bookingId={booking.id} eventHref={eventHref} />
        ) : (
          <p className="rounded-xl bg-muted p-4 text-sm">{ELIGIBILITY_MESSAGES[eligibility.reason]}</p>
        )}
      </div>
    </>
  );
}
