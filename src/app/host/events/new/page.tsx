import type { Metadata } from "next";
import { Suspense } from "react";

import { EventWizard } from "@/components/host/event-wizard";
import { PageHeader } from "@/components/host/stat-tile";
import { Skeleton } from "@/components/ui/skeleton";
import { requireHost } from "@/lib/auth/demo";
import { addDays } from "@/lib/clock";
import { isoDateNY } from "@/lib/format";
import { requestNow } from "@/lib/request-clock";
import type { EventInput } from "@/lib/validation/event";
import { getHostVenues, getPolicyTemplates } from "@/server/queries/host";

export const metadata: Metadata = { title: "Create event" };

export default function NewEventPage() {
  return (
    <div>
      <PageHeader title="Create an event" description="Eight short steps. Save a draft at any point; publishing puts it in guest discovery." />
      <Suspense fallback={<Skeleton className="h-[36rem] rounded-2xl" />}>
        <NewEvent />
      </Suspense>
    </div>
  );
}

async function NewEvent() {
  const { host } = await requireHost("/host/events/new");
  const now = await requestNow();
  const [venues, policies] = await Promise.all([getHostVenues(host.id), getPolicyTemplates(host.id)]);
  const today = isoDateNY(now);
  const standard = policies.find((p) => p.key === "STANDARD_48H") ?? policies[0];
  const initial: EventInput = {
    title: "",
    summary: "",
    description: "",
    category: "SUPPER_CLUB_PRIVATE_DINING",
    cuisine: "global",
    tags: [],
    format: "SEATED_DINNER",
    occasions: [],
    socialAtmosphere: "EITHER_WAY",
    photos: [],
    venue: venues.length ? { mode: "existing", venueId: venues[0].id } : { mode: "tbc" },
    sessions: [{ date: isoDateNY(addDays(now, 14)), time: "19:00", capacity: 12 }],
    ticketPriceDollars: 85,
    durationMinutes: 150,
    highlights: [],
    menu: [],
    menuSections: [],
    menuStatus: "FINAL",
    itinerary: [],
    featuredDishes: [],
    inclusions: [],
    dietaryOptions: [],
    policy: { mode: "template", templateId: standard?.id ?? "" },
    intent: "draft",
  };
  return <EventWizard initial={initial} venues={venues} policies={policies} today={today} />;
}
