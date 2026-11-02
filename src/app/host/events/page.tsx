import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarPlus } from "lucide-react";

import { EventActions } from "@/components/host/event-actions";
import { PageHeader } from "@/components/host/stat-tile";
import { EmptyState } from "@/components/site/empty-state";
import { Photo } from "@/components/site/photo";
import { SampleBadge } from "@/components/site/sample-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireHost } from "@/lib/auth/demo";
import { getCategory } from "@/lib/domain/categories";
import { cuisineLabel } from "@/lib/domain/taxonomy";
import { formatDateTime, formatPrice } from "@/lib/format";
import { requestNow } from "@/lib/request-clock";
import { cn } from "@/lib/utils";
import { getHostEvents, type HostEventRow } from "@/server/queries/host";

export const metadata: Metadata = { title: "My Events" };

const TABS = [
  { key: "all", label: "All" },
  { key: "PUBLISHED", label: "Published" },
  { key: "DRAFT", label: "Drafts" },
  { key: "UNPUBLISHED", label: "Unpublished" },
  { key: "CANCELLED", label: "Cancelled" },
] as const;

const STATUS_STYLE: Record<string, string> = {
  PUBLISHED: "bg-[#e5eddc] text-[#3f5130]",
  DRAFT: "bg-secondary text-foreground",
  UNPUBLISHED: "bg-muted text-muted-foreground",
  CANCELLED: "bg-foreground text-background",
  ARCHIVED: "bg-muted text-muted-foreground",
};

export default function HostEventsPage(props: PageProps<"/host/events">) {
  return (
    <div>
      <PageHeader
        title="My Events"
        description="Create, edit, publish and cancel your experiences. Only you can change your events."
        actions={
          <Button asChild variant="brand">
            <Link href="/host/events/new">
              <CalendarPlus aria-hidden /> Create event
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <Events {...props} />
      </Suspense>
    </div>
  );
}

async function Events({ searchParams }: PageProps<"/host/events">) {
  const { host } = await requireHost("/host/events");
  const now = await requestNow();
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.status)?.key ?? "all";
  const events = await getHostEvents(host.id, now);
  const shown = tab === "all" ? events : events.filter((e) => e.status === tab);
  const count = (k: string) => (k === "all" ? events.length : events.filter((e) => e.status === k).length);

  return (
    <>
      <nav aria-label="Filter by status" className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "all" ? "/host/events" : `/host/events?status=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors",
              tab === t.key ? "border-foreground bg-foreground text-background" : "hover:border-foreground/40",
            )}
          >
            {t.label} <span className="tabular-nums opacity-70">{count(t.key)}</span>
          </Link>
        ))}
      </nav>
      {shown.length ? (
        <ul className="space-y-4">
          {shown.map((e) => (
            <EventRow key={e.id} e={e} />
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={CalendarPlus}
          title={events.length ? "Nothing in this view" : "No events yet"}
          description={events.length ? "Try another status." : "Create your first event to start taking bookings."}
        >
          <Button asChild variant="brand">
            <Link href="/host/events/new">Create event</Link>
          </Button>
        </EmptyState>
      )}
    </>
  );
}

function EventRow({ e }: { e: HostEventRow }) {
  return (
    <li className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-soft sm:flex-row">
      <Photo src={e.photo ?? undefined} alt="" theme="terracotta" sizes="160px" className="aspect-[4/3] w-full shrink-0 rounded-xl sm:w-40" />
      <div className="min-w-0 flex-1 space-y-3">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_STYLE[e.status])}>{e.status.charAt(0) + e.status.slice(1).toLowerCase()}</span>
            <span className="text-xs text-muted-foreground">
              {getCategory(e.category).name} · {cuisineLabel(e.cuisine)} · {formatPrice(e.priceCents)}
            </span>
            {e.isFictional && <SampleBadge variant="outline" />}
          </div>
          <h2 className="font-display text-xl">{e.title}</h2>
          <p className="text-sm text-muted-foreground">
            {e.venue.isPlaceholder ? "Venue to be confirmed" : `${e.venue.name}, ${e.venue.neighborhood}`}
            {" · "}
            {e.nextSession ? `Next: ${formatDateTime(e.nextSession.startsAt)}` : "No upcoming dates"}
            {e.upcomingSessions > 0 && ` · ${e.upcomingSessions} upcoming, ${e.upcomingSold}/${e.upcomingSeats} seats sold`}
          </p>
        </div>
        <EventActions id={e.id} slug={e.slug} status={e.status} />
      </div>
    </li>
  );
}
