import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/host/stat-tile";
import { VenueRequestForm } from "@/components/host/venue-request-form";
import { Skeleton } from "@/components/ui/skeleton";
import { requireHost } from "@/lib/auth/demo";
import { getNeighborhood } from "@/lib/domain/neighborhoods";
import { parseList } from "@/lib/domain/lists";
import { formatDate, formatPrice } from "@/lib/format";
import { getVenueRequests } from "@/server/queries/host";

export const metadata: Metadata = { title: "Venue assistance" };

export default function VenueRequestPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Venue assistance"
        description="Tell us what kind of space you're looking for. This sends a request only: Tastable has not secured, reserved or guaranteed any venue. In this prototype, requests are stored but no one follows up."
      />
      <Suspense fallback={<Skeleton className="h-[30rem] rounded-2xl" />}>
        <Requests />
      </Suspense>
    </div>
  );
}

async function Requests() {
  const { host } = await requireHost("/host/venue-request");
  const requests = await getVenueRequests(host.id);
  return (
    <div className="space-y-10">
      <VenueRequestForm />
      {requests.length > 0 && (
        <section aria-labelledby="past-req">
          <h2 id="past-req" className="mb-4 text-2xl">
            Your requests
          </h2>
          <ul className="space-y-3">
            {requests.map((r) => (
              <li key={r.id} className="rounded-xl border bg-card p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    {r.guestCount} guests · {parseList(r.neighborhoods).map((k) => getNeighborhood(k)?.name ?? k).join(", ")}
                  </p>
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs">Submitted, no venue secured</span>
                </div>
                <p className="mt-1 text-muted-foreground">
                  {r.preferredDates}
                  {r.budgetCents !== null && ` · budget ${formatPrice(r.budgetCents)}`}
                  {r.needsKitchen && " · needs kitchen"} · sent {formatDate(r.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
