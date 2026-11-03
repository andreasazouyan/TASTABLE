"use client";

import { useOptimistic, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Heart } from "lucide-react";

import { toggleSaved } from "@/server/actions/saved";
import { cn } from "@/lib/utils";

/**
 * Heart toggle with the number of unique guests who saved the experience next to it.
 * Optimistic: the heart and the count update immediately, then the server's stored count
 * (Experience.saveCount) replaces the optimistic one. Never shows a negative number.
 * Unauthenticated users are redirected to choose a demo identity.
 */
export function SaveButton({
  experienceId,
  saved,
  saveCount,
  title,
  variant = "overlay",
  className,
}: {
  experienceId: string;
  saved: boolean;
  saveCount?: number;
  title: string;
  variant?: "overlay" | "inline";
  className?: string;
}) {
  const [optimistic, setOptimistic] = useOptimistic({ saved, count: Math.max(0, saveCount ?? 0) });
  const [, startTransition] = useTransition();
  const pathname = usePathname();
  const search = useSearchParams();
  const path = search.size ? `${pathname}?${search}` : pathname;
  const showCount = saveCount !== undefined;
  const countLabel = `${optimistic.count} ${optimistic.count === 1 ? "guest has" : "guests have"} saved this`;

  return (
    <form
      action={(fd) => {
        startTransition(async () => {
          setOptimistic({ saved: !optimistic.saved, count: Math.max(0, optimistic.count + (optimistic.saved ? -1 : 1)) });
          await toggleSaved(fd);
        });
      }}
      className={className}
    >
      <input type="hidden" name="experienceId" value={experienceId} />
      <input type="hidden" name="path" value={path} />
      <button
        type="submit"
        aria-pressed={optimistic.saved}
        aria-label={`${optimistic.saved ? `Remove ${title} from saved` : `Save ${title}`}${showCount ? `. ${countLabel}` : ""}`}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-full transition-[background-color,color,transform] duration-200 ease-soft focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none active:scale-95",
          variant === "overlay"
            ? cn("h-9 bg-card/90 text-foreground shadow-soft backdrop-blur hover:bg-card", showCount ? "min-w-9 px-3" : "w-9")
            : "h-10 border border-input bg-card px-4 text-sm font-medium hover:bg-muted",
        )}
      >
        <Heart className={cn("size-4", optimistic.saved && "fill-brand text-brand")} aria-hidden />
        {variant === "inline" && (optimistic.saved ? "Saved" : "Save")}
        {showCount && (
          <span className={cn("tabular-nums", variant === "overlay" ? "text-xs font-semibold" : "text-muted-foreground")} data-testid="save-count" aria-hidden>
            {optimistic.count}
          </span>
        )}
      </button>
    </form>
  );
}
