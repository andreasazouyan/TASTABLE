import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarDays, MapPin } from "lucide-react";

import { EmptyState } from "@/components/site/empty-state";
import { StatusBadge } from "@/components/booking/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { availability, seatsLeft } from "@/lib/booking/capacity";
import { getCurrentUser } from "@/lib/auth/demo";
import { db } from "@/lib/db";
import { formatDate, formatTime } from "@/lib/format";
import { requestNow } from "@/lib/request-clock";
import { respondToInvitationAction } from "@/server/actions/sharing";

export const metadata: Metadata = { title: "You're invited", robots: { index: false, follow: false } };

export default function InvitePage(props: PageProps<"/invite/[token]">) {
  return (
    <div className="container-page max-w-2xl pt-10 sm:pt-16">
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <Invite {...props} />
      </Suspense>
    </div>
  );
}

async function Invite({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const now = await requestNow();
  const [inv, user] = await Promise.all([
    db.eventInvitation.findUnique({
      where: { token },
      include: {
        inviter: { select: { displayName: true, id: true } },
        session: { include: { experience: { include: { venue: true, host: { select: { displayName: true } } } } } },
      },
    }),
    getCurrentUser(),
  ]);
  if (!inv) {
    return <EmptyState title="Invitation not found" description="The link may be mistyped or the invitation was withdrawn." />;
  }
  const s = inv.session;
  const e = s.experience;
  const isInviter = user?.guestProfile?.id === inv.inviter.id;
  const expired = inv.expiresAt <= now;
  const state = availability(s, now);

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-lift sm:p-8">
      <p className="eyebrow mb-2">Invitation</p>
      <h1 className="text-3xl sm:text-4xl">
        {inv.inviter.displayName.split(" ")[0]} invited {inv.inviteeName ? inv.inviteeName : "you"} to {e.title}
      </h1>
      {inv.message && <blockquote className="mt-4 border-l-2 border-brand pl-4 text-lg italic">&ldquo;{inv.message}&rdquo;</blockquote>}
      <dl className="mt-6 space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-brand" aria-hidden />
          <dt className="sr-only">When</dt>
          <dd>
            {formatDate(s.startsAt, { weekday: "long", month: "long", day: "numeric" })}, {formatTime(s.startsAt)}
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="size-4 text-brand" aria-hidden />
          <dt className="sr-only">Where</dt>
          <dd>
            {e.venue.neighborhood}, {e.venue.borough} · hosted by {e.host.displayName}
          </dd>
        </div>
      </dl>
      <div className="mt-4">
        <StatusBadge status={inv.status === "PENDING" ? "WAITING" : inv.status === "ACCEPTED" ? "CONFIRMED" : "CANCELLED"} label={expired ? "Expired" : inv.status.charAt(0) + inv.status.slice(1).toLowerCase()} />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild variant="brand">
          <Link href={`/experiences/${e.slug}?session=${s.id}`}>{state === "SOLD_OUT" ? "View event (sold out)" : "See the event"}</Link>
        </Button>
        {!isInviter && !expired && inv.status === "PENDING" && (
          <>
            <form action={respondToInvitationAction}>
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="response" value="ACCEPTED" />
              <Button type="submit" variant="outline">
                I&apos;m in
              </Button>
            </form>
            <form action={respondToInvitationAction}>
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="response" value="DECLINED" />
              <Button type="submit" variant="ghost">
                Can&apos;t make it
              </Button>
            </form>
          </>
        )}
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        {inv.bookingId
          ? "Your friend may already hold a ticket for you. If not, book your own seat: "
          : "Book your own seat: "}
        {state === "SOLD_OUT" ? "this date is sold out, but you can join the waitlist." : `${seatsLeft(s)} seats left.`}
      </p>
      {isInviter && <p className="mt-2 text-sm text-muted-foreground">You sent this invitation. Share this page&apos;s link with your friend.</p>}
      <p className="mt-6 text-xs text-muted-foreground">Fictional sample event. Invitations never show booking references, ticket codes or emails.</p>
    </div>
  );
}
