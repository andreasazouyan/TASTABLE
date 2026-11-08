import type { Metadata } from "next";
import { Suspense } from "react";

import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { Skeleton } from "@/components/ui/skeleton";
import { cookies } from "next/headers";

import { HOST_SIGNUP_COOKIE, requireGuest } from "@/lib/auth/demo";
import { toPrefsValue } from "@/lib/domain/preferences-value";
import { getGuestPreferences } from "@/server/queries/preferences";

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
  const prefs = await getGuestPreferences(guest.id);
  const step = Number(typeof sp.step === "string" ? sp.step : "1") - 1;
  const hostSignup = !!(await cookies()).get(HOST_SIGNUP_COOKIE);
  return (
    <>
      {hostSignup && (
        <p className="mx-auto mb-6 max-w-3xl rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
          <strong className="text-foreground">Welcome, host.</strong> First, a few questions about your own taste, so Tastable can recommend events
          to you too. Next, you&apos;ll set up your host profile.
        </p>
      )}
      <OnboardingWizard initial={toPrefsValue(prefs)} initialStep={Number.isFinite(step) ? step : 0} />
    </>
  );
}
