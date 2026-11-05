import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, CalendarPlus, CircleCheck, KeyRound, MapPin } from "lucide-react";

import { BookedDialog } from "@/components/booking/booked-dialog";
import { CancelPanel } from "@/components/booking/cancel-panel";
import { InviteForm } from "@/components/booking/invite-form";
import { ReminderBanners } from "@/components/booking/reminder-banners";
import { StatusBadge } from "@/components/booking/status-badge";
import { ShareButton } from "@/components/experiences/share-button";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireGuest } from "@/lib/auth/demo";
import { ticketQrSvg } from "@/lib/booking/qr";
import { BOOKED_POLICY_NOTICE, describeTerms, formatTimeRemaining, lateFeeCents, quoteCancellation, termsFromSnapshot } from "@/lib/booking/cancellation";
import { formatDate, formatDateTime, formatMoney, formatTime } from "@/lib/format";
import { requestNow } from "@/lib/request-clock";
import { getBookingByReference } from "@/server/queries/bookings";
import { isReginasTable, REGINA_CONFIRMED_TITLE, REGINA_PRICE_NOTE } from "@/lib/domain/reginas-table";

export const metadata: Metadata = { title: "Your ticket" };

export default function TicketPage(props: PageProps<"/bookings/[reference]">) {
  return (
    <Suspense fallback={<div className="container-page py-10"><Skeleton className="h-[36rem] rounded-2xl" /></div>}>
      <Ticket {...props} />
    </Suspense>
  );
}

async function Ticket({ params, searchParams }: PageProps<"/bookings/[reference]">) {
  const { reference } = await params;
  const sp = await searchParams;
  const { guest } = await requireGuest(`/bookings/${reference}`);
  const now = await requestNow();
  const b = await getBookingByReference(reference, guest.id);
  if (!b) notFound();

  const e = b.session.experience;
  const qrs = await Promise.all(b.tickets.map((t) => ticketQrSvg(t.code)));
  const upcoming = b.session.startsAt > now;
  const active = b.status === "CONFIRMED";
  // Always the terms accepted with this booking, never the event's current policy.
  const terms = termsFromSnapshot(b.policySnapshot, e.cancellationPolicy);
  const q = quoteCancellation(b, terms, b.session.startsAt, now);
  const lateFee = terms.kind === "LATE_FEE" ? lateFeeCents(b.subtotalCents, terms.lateFeePercent) : null;
  const revealAddress = !e.venue.isSecretLocation || b.session.startsAt.getTime() - now.getTime() <= 24 * 3_600_000;
  const regina = isReginasTable(e.slug);
  const meals = b.tickets.map((t, i) => `${t.attendeeName ?? (i === 0 ? "You" : "Your +1")}: ${t.mealChoice ?? "Not chosen"}`);

  return (
    <div className="container-page max-w-5xl pt-6 sm:pt-10">
      <Link href="/bookings" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> My Bookings
      </Link>

      <ReminderBanners guestId={guest.id} now={now} />

      {sp.confirmed && active && (
        <BookedDialog
          title={e.title}
          dateLabel={formatDate(b.session.startsAt, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          timeLabel={`${formatTime(b.session.startsAt)} – ${formatTime(b.session.endsAt)}`}
          tickets={b.ticketCount}
          totalLabel={regina ? `${formatMoney(b.totalPriceCents)} · complimentary` : formatMoney(b.totalPriceCents)}
          policyNotice={!regina && terms.kind === "LATE_FEE" ? BOOKED_POLICY_NOTICE : null}
          feeSentence={!regina && lateFee !== null ? `For your ${formatMoney(b.subtotalCents)} booking, the late cancellation fee would be ${formatMoney(lateFee)}.` : null}
          icsHref={`/api/bookings/${b.reference}/ics`}
          {...(regina
            ? {
                heading: REGINA_CONFIRMED_TITLE,
                ticketsTitle: "Guests",
                totalTitle: "Total",
                extraRows: [
                  { label: "Venue", value: `${e.venue.name}, ${e.venue.addressLine}` },
                  { label: "Main courses", value: meals.join(" · ") },
                  { label: "Reservation", value: b.reference },
                ],
              }
            : {})}
        />
      )}

      {sp.confirmed && active && regina && (
        <div role="status" className="mb-8 flex items-start gap-3 rounded-2xl bg-[#e5eddc] p-5 text-[#2f3d24]">
          <CircleCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">
              {REGINA_CONFIRMED_TITLE} Reservation {b.reference} for {b.ticketCount} guests is confirmed.
            </p>
            <p className="text-sm">{REGINA_PRICE_NOTE}. Total {formatMoney(b.totalPriceCents)}, nothing to pay. Your tickets and main courses are below.</p>
          </div>
        </div>
      )}

      {sp.confirmed && active && !regina && (
        <div role="status" className="mb-8 flex items-start gap-3 rounded-2xl bg-[#e5eddc] p-5 text-[#2f3d24]">
          <CircleCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">
              You&apos;re going! Booking {b.reference} for {b.ticketCount} {b.ticketCount === 1 ? "seat" : "seats"} is confirmed.
            </p>
            <p className="text-sm">
              Simulated payment {b.paymentReference} for {formatMoney(b.totalPriceCents)} recorded. No real money moved. Your tickets are below.
            </p>
          </div>
        </div>
      )}

      {b.status === "CANCELLED" && (
        <div role="status" className="mb-8 rounded-2xl bg-muted p-5">
          <p className="font-medium">This booking is cancelled.</p>
          <p className="text-sm text-muted-foreground">
            Cancelled {b.cancelledAt ? formatDateTime(b.cancelledAt) : ""}.
            {b.cancellationFeeCents ? ` A ${formatMoney(b.cancellationFeeCents)} cancellation fee was kept and ${formatMoney(b.refundAmountCents)} was refunded.` : ""}
            {b.cancellationFeeCents ? " Recorded as a simulated transaction" : ` Refund of ${formatMoney(b.refundAmountCents)} recorded as a simulated transaction`}
            {b.refundAmountCents === 0 && !b.cancellationFeeCents ? " (no refund was due under the policy)" : ""}. Your seats were released.
          </p>
        </div>
      )}

      <header className="mb-8">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <StatusBadge status={b.status} />
          <span className="font-mono text-sm text-muted-foreground">Ref {b.reference}</span>
        </div>
        <h1 className="text-4xl sm:text-5xl">
          <Link href={`/experiences/${e.slug}`} className="hover:underline">
            {e.title}
          </Link>
        </h1>
        <p className="mt-2 text-muted-foreground">Hosted by {e.host.displayName}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <section aria-labelledby="tickets-title">
          <h2 id="tickets-title" className="sr-only">
            Tickets
          </h2>
          <ol className="space-y-4">
            {b.tickets.map((t, i) => (
              <li key={t.id} className="overflow-hidden rounded-2xl border bg-card shadow-soft">
                <div className="grid sm:grid-cols-[1fr_auto]">
                  <div className="p-5 sm:p-6">
                    <p className="eyebrow mb-2">
                      Ticket {i + 1} of {b.ticketCount}
                    </p>
                    <p className="font-display text-xl">{t.attendeeName ?? `Guest ${i + 1}`}</p>
                    <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                      <div>
                        <dt className="text-muted-foreground">Date</dt>
                        <dd>{formatDate(b.session.startsAt, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Time</dt>
                        <dd>
                          {formatTime(b.session.startsAt)} – {formatTime(b.session.endsAt)}
                        </dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-muted-foreground">Venue</dt>
                        <dd>
                          {e.venue.isSecretLocation && !revealAddress ? "Secret location" : e.venue.name}, {e.venue.neighborhood}
                          {!e.venue.isFictional && <span className="block text-muted-foreground">{e.venue.addressLine}</span>}
                        </dd>
                      </div>
                      {t.mealChoice && (
                        <div className="col-span-2">
                          <dt className="text-muted-foreground">Main course</dt>
                          <dd data-testid="meal-choice">{t.mealChoice}</dd>
                        </div>
                      )}
                      <div>
                        <dt className="text-muted-foreground">Ticket status</dt>
                        <dd>
                          <StatusBadge status={t.status} />
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Code</dt>
                        <dd className="font-mono text-xs">{t.code}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="flex flex-col items-center justify-center border-t border-dashed bg-background/60 p-5 sm:border-t-0 sm:border-l">
                    {t.status === "CANCELLED" ? (
                      <p className="w-36 text-center text-sm text-muted-foreground">This ticket is no longer valid.</p>
                    ) : (
                      <div
                        role="img"
                        aria-label={`QR code for ticket ${t.code}`}
                        className="size-36 [&_svg]:size-full"
                        dangerouslySetInnerHTML={{ __html: qrs[i] }}
                      />
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">Show at the door</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>

          {active && upcoming && (
            <section className="mt-10" aria-labelledby="invite-title">
              <h2 id="invite-title" className="mb-1 text-2xl">
                Invite a friend
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Send a private link to this event. They&apos;ll see the event details, not your booking or ticket details.
              </p>
              <InviteForm bookingId={b.id} title={e.title} />
            </section>
          )}
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border bg-card p-5 shadow-soft">
            <h2 className="mb-3 text-lg">Details</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Tickets</dt>
                <dd>
                  {b.ticketCount} × {formatMoney(b.unitPriceCents)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Service fee</dt>
                <dd>{formatMoney(b.serviceFeeCents)}</dd>
              </div>
              <div className="flex justify-between font-medium">
                <dt>Total (simulated)</dt>
                <dd>{formatMoney(b.totalPriceCents)}</dd>
              </div>
              {b.status === "CANCELLED" && (
                <>
                  {b.cancellationFeeCents ? (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Cancellation fee ({b.cancellationFeePercent}%)</dt>
                      <dd>{formatMoney(b.cancellationFeeCents)}</dd>
                    </div>
                  ) : null}
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Refunded</dt>
                    <dd>{formatMoney(b.refundAmountCents)}</dd>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cancelled {b.cancelledAt ? formatDateTime(b.cancelledAt) : ""} by {b.cancelledBy?.toLowerCase()}.
                  </p>
                </>
              )}
            </dl>
            {revealAddress ? (
              <p className="mt-4 flex items-start gap-2 text-sm">
                <MapPin className="mt-0.5 size-4 text-brand" aria-hidden /> {e.venue.addressLine}
              </p>
            ) : (
              <p className="mt-4 flex items-start gap-2 text-sm">
                <KeyRound className="mt-0.5 size-4 text-brand" aria-hidden /> Address revealed 24 hours before the start.
              </p>
            )}
          </div>

          {active && (
            <div className="space-y-2">
              <Button asChild variant="outline" className="w-full">
                <a href={`/api/bookings/${b.reference}/ics`} download>
                  <CalendarPlus aria-hidden /> Add to calendar (.ics)
                </a>
              </Button>
              <ShareButton url={`/experiences/${e.slug}`} title={e.title} label="Share event" />
            </div>
          )}

          <div className="rounded-2xl border bg-card p-5 text-sm shadow-soft">
            <h2 className="mb-2 text-lg">Your cancellation terms</h2>
            <ul className="space-y-1 text-muted-foreground">
              {describeTerms(terms).map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            {lateFee !== null && active && (
              <p className="mt-2">
                For this booking, the late cancellation fee would be <strong>{formatMoney(lateFee)}</strong>.
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">Accepted when you booked. Later policy changes don&apos;t affect this booking.</p>
          </div>

          {active && upcoming && q.allowed && (
            <div className="pt-2">
              <CancelPanel
                bookingId={b.id}
                refundLabel={formatMoney(q.refundCents)}
                paidLabel={formatMoney(b.totalPriceCents)}
                feeLabel={formatMoney(q.feeCents)}
                feePercent={q.feePercent}
                timeRemaining={formatTimeRemaining(q.msUntilStart) ?? "Started"}
                explanation={q.explanation}
                calculatedAt={formatDateTime(now)}
              />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
