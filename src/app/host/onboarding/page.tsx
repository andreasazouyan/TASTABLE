import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { HostProfileForm } from "@/components/host/host-profile-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth/demo";

export const metadata: Metadata = { title: "Become a host" };

export default function HostOnboardingPage() {
  return (
    <div className="max-w-4xl">
      <p className="eyebrow mb-2">Host onboarding</p>
      <h1 className="text-4xl sm:text-5xl">Set up your host profile</h1>
      <p className="mt-3 mb-10 max-w-2xl text-muted-foreground">
        Tell guests who you are. You can edit everything later from Profile. Demo only: nothing here is verified.
      </p>
      <Suspense fallback={<Skeleton className="h-[40rem] rounded-2xl" />}>
        <Onboarding />
      </Suspense>
    </div>
  );
}

async function Onboarding() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="rounded-2xl border bg-card p-6">
        <p>Choose a demo identity first. Pick a guest (like Alex) to try becoming a host, or a demo host to see a full dashboard.</p>
        <Button asChild className="mt-4">
          <Link href="/sign-in?next=/host/onboarding&as=host">Choose a demo identity</Link>
        </Button>
      </div>
    );
  }
  if (user.hostProfile) redirect("/host");
  return (
    <HostProfileForm
      submitLabel="Create host profile"
      initial={{ hostType: "", displayName: user.name, tagline: "", bio: "", background: "", cuisineExpertise: [], homeNeighborhood: user.guestProfile?.homeNeighborhood ?? "", profilePhotoUrl: "", credentials: "", instagramHandle: "" }}
    />
  );
}
