"use client";

import { useOptimistic, useTransition } from "react";
import { usePathname } from "next/navigation";
import { Check, Plus } from "lucide-react";

import { toggleFollowHost } from "@/server/actions/saved";
import { cn } from "@/lib/utils";

export function FollowButton({ hostSlug, hostName, following }: { hostSlug: string; hostName: string; following: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(following);
  const [, startTransition] = useTransition();
  const pathname = usePathname();
  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          setOptimistic(!optimistic);
          await toggleFollowHost(fd);
        })
      }
    >
      <input type="hidden" name="hostSlug" value={hostSlug} />
      <input type="hidden" name="path" value={pathname} />
      <button
        type="submit"
        aria-pressed={optimistic}
        aria-label={optimistic ? `Unfollow ${hostName}` : `Follow ${hostName}`}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none",
          optimistic ? "border-foreground bg-foreground text-background" : "border-input bg-card hover:bg-muted",
        )}
      >
        {optimistic ? <Check className="size-4" aria-hidden /> : <Plus className="size-4" aria-hidden />}
        {optimistic ? "Following" : "Follow"}
      </button>
    </form>
  );
}
