import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChefHat, Heart, Settings2, Ticket } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth/demo";
import { getCategory } from "@/lib/domain/categories";
import { parseList } from "@/lib/domain/lists";
import { getNeighborhood } from "@/lib/domain/neighborhoods";
import { cuisineLabel, MOTIVATIONS } from "@/lib/domain/taxonomy";
import { db } from "@/lib/db";
import { signOut } from "@/server/actions/auth";
import type { ExperienceCategory } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <div className="container-page max-w-4xl pt-8 sm:pt-12">
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <Profile />
      </Suspense>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b py-4 last:border-b-0 sm:grid-cols-[12rem_1fr]">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd>{value || <span className="text-muted-foreground">Not set</span>}</dd>
    </div>
  );
}

async function Profile() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="py-10 text-center">
        <h1 className="text-4xl">Your profile</h1>
        <p className="mt-3 text-muted-foreground">Choose a demo identity to see bookings, saved experiences and preferences.</p>
        <Button asChild className="mt-6">
          <Link href="/sign-in?next=/profile">Choose a demo identity</Link>
        </Button>
      </div>
    );
  }
  const prefs = user.guestProfile?.preferences;
  const counts = user.guestProfile
    ? await Promise.all([
        db.booking.count({ where: { guestId: user.guestProfile.id, status: "CONFIRMED" } }),
        db.savedExperience.count({ where: { guestId: user.guestProfile.id } }),
      ])
    : [0, 0];
  const location = prefs?.locationKey && prefs.locationKey !== "nyc" ? getNeighborhood(prefs.locationKey)?.name : "Anywhere in NYC";

  return (
    <>
      <header className="mb-10 flex flex-wrap items-center gap-5">
        <span aria-hidden className="grid size-20 place-items-center rounded-full bg-brand-soft font-display text-3xl text-accent-foreground">
          {user.name[0]}
        </span>
        <div className="flex-1">
          <p className="eyebrow mb-1">Demo {user.role === "HOST" ? "host" : "guest"}</p>
          <h1 className="text-4xl">{user.name}</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/sign-in">Switch identity</Link>
          </Button>
          <form action={signOut}>
            <Button type="submit" variant="ghost">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <div className="mb-10 grid gap-3 sm:grid-cols-3">
        <Link href="/bookings" className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-soft hover:border-foreground/25">
          <Ticket className="size-5 text-brand" aria-hidden /> <span>{counts[0]} active bookings</span>
        </Link>
        <Link href="/saved" className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-soft hover:border-foreground/25">
          <Heart className="size-5 text-brand" aria-hidden /> <span>{counts[1]} saved</span>
        </Link>
        <Link href="/host" className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-soft hover:border-foreground/25">
          <ChefHat className="size-5 text-brand" aria-hidden /> <span>{user.hostProfile ? "Host dashboard" : "Become a host"}</span>
        </Link>
      </div>

      <section aria-labelledby="prefs-title" className="rounded-2xl border bg-card p-6 shadow-soft">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <h2 id="prefs-title" className="text-2xl">
            Preferences
          </h2>
          <div className="flex gap-2">
            {!prefs?.onboardingCompletedAt && (
              <Button asChild variant="brand" size="sm">
                <Link href="/onboarding">Start onboarding</Link>
              </Button>
            )}
            <Button asChild variant="outline" size="sm">
              <Link href="/profile/preferences">
                <Settings2 aria-hidden /> Edit preferences
              </Link>
            </Button>
          </div>
        </div>
        <dl>
          <Row label="Location" value={location ?? ""} />
          <Row label="Travel radius" value={prefs?.travelRadiusMiles ? `${prefs.travelRadiusMiles} miles` : "Anywhere in NYC"} />
          <Row label="Cuisines" value={parseList(prefs?.favoriteCuisines).map(cuisineLabel).join(", ")} />
          <Row label="Categories" value={parseList(prefs?.favoriteCategories).map((c) => getCategory(c as ExperienceCategory).shortName).join(", ")} />
          <Row label="Motivations" value={parseList(prefs?.motivations).map((m) => MOTIVATIONS.find((x) => x.key === m)?.label ?? m).join(", ")} />
        </dl>
      </section>
    </>
  );
}
