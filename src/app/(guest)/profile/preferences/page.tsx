import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";

import { PreferencesEditor } from "@/components/onboarding/preferences-editor";
import { Skeleton } from "@/components/ui/skeleton";
import { requireGuest } from "@/lib/auth/demo";
import { db } from "@/lib/db";
import { toPrefsValue } from "@/server/queries/preferences";

export const metadata: Metadata = { title: "Edit preferences" };

export default function PreferencesPage() {
  return (
    <div className="container-page max-w-4xl pt-8 sm:pt-12">
      <Link href="/profile" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Profile
      </Link>
      <h1 className="text-4xl sm:text-5xl">Edit preferences</h1>
      <p className="mt-3 mb-10 max-w-2xl text-muted-foreground">
        These drive your &ldquo;Recommended for You&rdquo; picks using simple, visible rules. Change them any time.
      </p>
      <Suspense fallback={<Skeleton className="h-[40rem] rounded-2xl" />}>
        <Editor />
      </Suspense>
    </div>
  );
}

async function Editor() {
  const { guest } = await requireGuest("/profile/preferences");
  const prefs = await db.guestPreferences.findUnique({ where: { guestProfileId: guest.id } });
  return <PreferencesEditor initial={toPrefsValue(prefs)} />;
}
