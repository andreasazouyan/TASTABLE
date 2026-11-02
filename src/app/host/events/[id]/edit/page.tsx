import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { EventWizard } from "@/components/host/event-wizard";
import { PageHeader } from "@/components/host/stat-tile";
import { Skeleton } from "@/components/ui/skeleton";
import { requireHost } from "@/lib/auth/demo";
import { isoDateNY } from "@/lib/format";
import { requestNow } from "@/lib/request-clock";
import { getEventForEdit, getHostVenues, getPolicyTemplates } from "@/server/queries/host";

export const metadata: Metadata = { title: "Edit event" };

export default function EditEventPage(props: PageProps<"/host/events/[id]/edit">) {
  return (
    <Suspense fallback={<Skeleton className="h-[36rem] rounded-2xl" />}>
      <EditEvent {...props} />
    </Suspense>
  );
}

async function EditEvent({ params, searchParams }: PageProps<"/host/events/[id]/edit">) {
  const { id } = await params;
  const sp = await searchParams;
  const { host } = await requireHost(`/host/events/${id}/edit`);
  const now = await requestNow();
  // Ownership: getEventForEdit returns null for other hosts' events, so they 404.
  const [loaded, venues, policies] = await Promise.all([getEventForEdit(host.id, id), getHostVenues(host.id), getPolicyTemplates(host.id)]);
  if (!loaded || loaded.experience.status === "CANCELLED") notFound();
  const statusLabel = loaded.experience.status.charAt(0) + loaded.experience.status.slice(1).toLowerCase();
  return (
    <div>
      <PageHeader
        eyebrow={statusLabel}
        title={`Edit: ${loaded.experience.title}`}
        description={
          sp.duplicated === "1"
            ? "This is a draft copy. Update the dates, then publish when ready."
            : loaded.experience.status === "PUBLISHED"
              ? "Changes to a published event go live when you save. Dates with bookings can't be removed, and capacity can't drop below seats sold."
              : undefined
        }
      />
      <EventWizard live={loaded.experience.status === "PUBLISHED"} experienceId={id} initial={loaded.value} sold={loaded.sold} venues={venues} policies={policies} today={isoDateNY(now)} />
    </div>
  );
}
