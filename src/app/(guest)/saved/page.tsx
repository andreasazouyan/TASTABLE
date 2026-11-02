import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Heart } from "lucide-react";

import { ExperienceCard } from "@/components/experiences/experience-card";
import { EmptyState } from "@/components/site/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireGuest } from "@/lib/auth/demo";
import { applyFilters, filtersSchema } from "@/lib/discovery/filters";
import { db } from "@/lib/db";
import { requestNow } from "@/lib/request-clock";
import { getListings } from "@/server/queries/listings";

export const metadata: Metadata = { title: "Saved" };

export default function SavedPage() {
  return (
    <div className="container-page pt-8 sm:pt-12">
      <p className="eyebrow mb-2">Your shortlist</p>
      <h1 className="mb-8 text-4xl sm:text-5xl">Saved</h1>
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <Saved />
      </Suspense>
    </div>
  );
}

async function Saved() {
  const { guest } = await requireGuest("/saved");
  const now = await requestNow();
  const [rows, listings] = await Promise.all([
    db.savedExperience.findMany({ where: { guestId: guest.id }, orderBy: { createdAt: "desc" } }),
    getListings(now.toISOString()),
  ]);
  const order = rows.map((r) => r.experienceId);
  const all = applyFilters(listings, filtersSchema.parse({}), now);
  const items = order.map((id) => all.find((l) => l.id === id)).filter((x) => x !== undefined);
  const withoutDates = order.filter((id) => !all.some((l) => l.id === id)).length;

  if (!items.length) {
    return (
      <EmptyState icon={Heart} title="Nothing saved yet" description="Tap the heart on any experience to keep it here. Saved dates also appear on your calendar.">
        <Button asChild>
          <Link href="/discover">Discover experiences</Link>
        </Button>
      </EmptyState>
    );
  }
  return (
    <>
      <ul className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((l) => (
          <li key={l.id}>
            <ExperienceCard listing={l} saved />
          </li>
        ))}
      </ul>
      {withoutDates > 0 && <p className="mt-8 text-sm text-muted-foreground">{withoutDates} saved experience(s) have no upcoming dates right now.</p>}
    </>
  );
}
