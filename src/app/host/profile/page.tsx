import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { HostProfileForm } from "@/components/host/host-profile-form";
import { Skeleton } from "@/components/ui/skeleton";
import { requireHost } from "@/lib/auth/demo";
import { parseList } from "@/lib/domain/lists";

export const metadata: Metadata = { title: "Profile" };

export default function HostProfilePage() {
  return (
    <div className="max-w-4xl">
      <h1 className="mb-2 text-4xl">Host profile</h1>
      <p className="mb-10 text-muted-foreground">
        Shown on your event pages. Need a space? <Link href="/host/venue-request" className="text-brand underline">Request venue assistance</Link>.
      </p>
      <Suspense fallback={<Skeleton className="h-[40rem] rounded-2xl" />}>
        <Profile />
      </Suspense>
    </div>
  );
}

async function Profile() {
  const { host } = await requireHost("/host/profile");
  return (
    <HostProfileForm
      submitLabel="Save profile"
      initial={{
        hostType: host.hostType,
        displayName: host.displayName,
        tagline: host.tagline,
        bio: host.bio,
        background: host.background,
        cuisineExpertise: parseList(host.cuisineExpertise),
        homeNeighborhood: host.homeNeighborhood ?? "",
        profilePhotoUrl: host.profilePhotoUrl ?? "",
        credentials: host.credentials,
        instagramHandle: host.instagramHandle ?? "",
      }}
    />
  );
}
