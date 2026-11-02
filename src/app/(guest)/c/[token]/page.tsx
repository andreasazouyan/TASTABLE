import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarDays, MapPin } from "lucide-react";

import { EmptyState } from "@/components/site/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatTime } from "@/lib/format";
import { requestNow } from "@/lib/request-clock";
import { getSharedCalendar } from "@/server/queries/calendar";

export const metadata: Metadata = { title: "Shared plans", robots: { index: false, follow: false } };

export default function SharedCalendarPage(props: PageProps<"/c/[token]">) {
  return (
    <div className="container-page max-w-3xl pt-10 sm:pt-16">
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <Shared {...props} />
      </Suspense>
    </div>
  );
}

async function Shared({ params }: PageProps<"/c/[token]">) {
  const { token } = await params;
  const now = await requestNow();
  const cal = await getSharedCalendar(token, now);
  if (!cal) {
    return (
      <EmptyState title="This link isn't active" description="The owner may have stopped sharing their calendar, or the link is incorrect.">
        <Button asChild>
          <Link href="/discover">Discover experiences</Link>
        </Button>
      </EmptyState>
    );
  }
  return (
    <>
      <p className="eyebrow mb-2">Shared on Tastable</p>
      <h1 className="text-4xl sm:text-5xl">{cal.ownerFirstName}&apos;s upcoming plans</h1>
      <p className="mt-3 text-muted-foreground">Want to join? Book your own seats on the same date.</p>
      {cal.events.length ? (
        <ul className="mt-8 space-y-3">
          {cal.events.map((e) => (
            <li key={e.sessionId} className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-xl">{e.title}</h2>
                <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="size-4" aria-hidden /> {formatDate(e.startsAt, { weekday: "long", month: "long", day: "numeric" })}, {formatTime(e.startsAt)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-4" aria-hidden /> {e.neighborhood}, {e.borough}
                  </span>
                </p>
              </div>
              {e.slug && (
                <Button asChild variant="brand">
                  <Link href={`/experiences/${e.slug}?session=${e.sessionId}`}>Join this date</Link>
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState className="mt-8" title="Nothing shared right now" description="Check back later." />
      )}
      <p className="mt-6 text-sm">
        <a href={`/c/${token}/calendar.ics`} className="text-brand underline-offset-4 hover:underline">
          Subscribe or download (.ics)
        </a>
      </p>
      <p className="mt-6 text-xs text-muted-foreground">Fictional sample events. Only the events the owner chose are shown.</p>
    </>
  );
}
