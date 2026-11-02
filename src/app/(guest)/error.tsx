"use client";

import Link from "next/link";
import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Guest-side error boundary: friendly message, retry, and a way home. */
export default function GuestError({ error, retry }: { error: Error & { digest?: string }; retry?: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <span className="mb-4 grid size-12 place-items-center rounded-full bg-brand-soft text-accent-foreground">
        <TriangleAlert className="size-5" aria-hidden />
      </span>
      <h1 className="text-3xl">Something went wrong</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        We couldn&apos;t load this page. This is a prototype, so if it keeps happening try resetting the demo data.
      </p>
      <div className="mt-6 flex gap-3">
        <Button onClick={() => (retry ? retry() : window.location.reload())}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
