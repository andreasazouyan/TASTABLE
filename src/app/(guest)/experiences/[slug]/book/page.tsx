import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";

import { CheckoutForm } from "@/components/booking/checkout-form";
import { Photo } from "@/components/site/photo";
import { EmptyState } from "@/components/site/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireGuest } from "@/lib/auth/demo";
import { availability, seatsLeft } from "@/lib/booking/capacity";
import { sessionUnitPrice } from "@/lib/booking/pricing";
import { describeTerms, STANDARD_LATE_FEE_TERMS } from "@/lib/booking/cancellation";
import { db } from "@/lib/db";
import { parseList } from "@/lib/domain/lists";
import { dietaryLabel } from "@/lib/domain/taxonomy";
import { formatDate, formatTime } from "@/lib/format";
import { requestNow } from "@/lib/request-clock";
import { ReginaReservationForm } from "@/components/booking/regina-reservation-form";
import { isReginasTable, REGINA_CONFIRMED_TITLE } from "@/lib/domain/reginas-table";
import { findReginaReservation } from "@/server/services/reginas-table";

export const metadata: Metadata = { title: "Checkout" };

export default function BookPage(props: PageProps<"/experiences/[slug]/book">) {
  return (
    <Suspense fallback={<div className="container-page py-10"><Skeleton className="h-[40rem] rounded-2xl" /></div>}>
      <Checkout {...props} />
    </Suspense>
  );
}

async function Checkout({ params, searchParams }: PageProps<"/experiences/[slug]/book">) {
  const { slug } = await params;
  const sp = await searchParams;
  const sessionId = typeof sp.session === "string" ? sp.session : "";
  // Seat quantity chosen on the event page; clamped again in the form and re-validated on the server.
  const requestedSeats = typeof sp.seats === "string" ? sp.seats : undefined;
  const { user, guest } = await requireGuest(`/experiences/${slug}/book?session=${sessionId}${requestedSeats ? `&seats=${encodeURIComponent(requestedSeats)}` : ""}`);
  const now = await requestNow();

  const session = await db.experienceSession.findFirst({
    where: { id: sessionId, experience: { slug, status: "PUBLISHED" } },
    include: { experience: { include: { cancellationPolicy: true, venue: true, photos: { take: 1, orderBy: { sortOrder: "asc" } } } } },
  });
  if (!session) notFound();
  const exp = session.experience;
  const state = availability(session, now);
  const left = seatsLeft(session);
  const regina = isReginasTable(exp.slug);
  const reginaReservation = regina ? await findReginaReservation(db, guest.id) : null;
  const open = state === "AVAILABLE" || state === "LIMITED";

  return (
    <div className="container-page pt-6 sm:pt-10">
      <Link href={`/experiences/${slug}?session=${session.id}`} className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Back to experience
      </Link>
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center">
        <Photo src={exp.photos[0]?.url} alt={exp.photos[0]?.alt ?? exp.title} theme="terracotta" sizes="160px" className="aspect-[4/3] w-full shrink-0 rounded-xl sm:w-40" />
        <div>
          <p className="eyebrow mb-1">{regina ? "Reserve your seats" : "Demo checkout"}</p>
          <h1 className="text-3xl sm:text-4xl">{exp.title}</h1>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-4" aria-hidden /> {formatDate(session.startsAt, { weekday: "long", month: "long", day: "numeric" })}, {formatTime(session.startsAt)}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4" aria-hidden /> {exp.venue.isSecretLocation ? "Secret location" : exp.venue.name}, {exp.venue.neighborhood}
            </span>
          </p>
        </div>
      </div>

      {reginaReservation ? (
        <EmptyState title={REGINA_CONFIRMED_TITLE} description={`You already have a reservation for this event.`}>
          <Button asChild>
            <Link href={`/bookings/${reginaReservation.reference}`}>See your reservation</Link>
          </Button>
        </EmptyState>
      ) : regina && open ? (
        <ReginaReservationForm
          sessionId={session.id}
          seatsLeft={left}
          initialSeats={typeof sp.seats === "string" ? Number(sp.seats) : 1}
          dateLabel={formatDate(session.startsAt, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          timeLabel={`${formatTime(session.startsAt)} – ${formatTime(session.endsAt)}`}
          venueName={exp.venue.name}
          venueAddress={exp.venue.addressLine}
          defaultName={user.name}
          defaultEmail={user.email}
        />
      ) : open ? (
        <CheckoutForm
          sessionId={session.id}
          unitPriceCents={sessionUnitPrice(session, exp)}
          seatsLeft={left}
          initialSeats={requestedSeats}
          policyName={STANDARD_LATE_FEE_TERMS.name}
          policyLines={describeTerms(STANDARD_LATE_FEE_TERMS)}
          defaultName={user.name}
          defaultEmail={user.email}
          dietaryOptions={parseList(exp.dietaryOptions).map(dietaryLabel)}
        />
      ) : (
        <EmptyState
          title={state === "SOLD_OUT" ? "This date is sold out" : "This date can't be booked"}
          description={state === "SOLD_OUT" ? "You can join the waitlist from the experience page, or choose another date." : "It has already started or was cancelled."}
        >
          <Button asChild>
            <Link href={`/experiences/${slug}`}>See other dates</Link>
          </Button>
        </EmptyState>
      )}
    </div>
  );
}
