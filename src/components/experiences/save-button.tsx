"use client";

import { useOptimistic, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Heart } from "lucide-react";

import { toggleSaved } from "@/server/actions/saved";
import { cn } from "@/lib/utils";

/** Heart toggle. Optimistic; unauthenticated users are redirected to choose a demo identity. */
export function SaveButton({
  experienceId,
  saved,
  title,
  variant = "overlay",
  className,
}: {
  experienceId: string;
  saved: boolean;
  title: string;
  variant?: "overlay" | "inline";
  className?: string;
}) {
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [, startTransition] = useTransition();
  const pathname = usePathname();
  const search = useSearchParams();
  const path = search.size ? `${pathname}?${search}` : pathname;

  return (
    <form
      action={(fd) => {
        startTransition(async () => {
          setOptimistic(!optimistic);
          await toggleSaved(fd);
        });
      }}
      className={className}
    >
      <input type="hidden" name="experienceId" value={experienceId} />
      <input type="hidden" name="path" value={path} />
      <button
        type="submit"
        aria-pressed={optimistic}
        aria-label={optimistic ? `Remove ${title} from saved` : `Save ${title}`}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-full transition-[background-color,color,transform] duration-200 ease-soft focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none active:scale-95",
          variant === "overlay"
            ? "size-9 bg-card/90 text-foreground shadow-soft backdrop-blur hover:bg-card"
            : "h-10 border border-input bg-card px-4 text-sm font-medium hover:bg-muted",
        )}
      >
        <Heart className={cn("size-4", optimistic && "fill-brand text-brand")} aria-hidden />
        {variant === "inline" && (optimistic ? "Saved" : "Save")}
      </button>
    </form>
  );
}
