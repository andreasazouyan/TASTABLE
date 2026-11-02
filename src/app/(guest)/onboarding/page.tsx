import type { Metadata } from "next";
import { Suspense } from "react";

import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { Skeleton } from "@/components/ui/skeleton";
import { requireGuest } from "@/lib/auth/demo";
import { db } from "@/lib/db";
import { toPrefsValue } from "@/server/queries/preferences";

export const metadata: Metadata = { title: "Personalise Tastable" };

export default function OnboardingPage(props: PageProps<"/onboarding">) {
  return (
    <div className="container-page pt-8 pb-10 sm:pt-14">
      <Suspense fallback={<Skeleton className="mx-auto h-[32rem] max-w-3xl rounded-2xl" />}>
        <Onboarding {...props} />
      </Suspense>
    </div>
  );
}

async function Onboarding({ searchParams }: PageProps<"/onboarding">) {
  const sp = await searchParams;
  const { guest } = await requireGuest("/onboarding");
  const prefs = await db.guestPreferences.findUnique({ where: { guestProfileId: guest.id } });
  const step = Number(typeof sp.step === "string" ? sp.step : "1") - 1;
  return <OnboardingWizard initial={toPrefsValue(prefs)} initialStep={Number.isFinite(step) ? step : 0} />;
}
