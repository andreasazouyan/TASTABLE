import { CalendarDays, MapPin, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NeighborhoodOptions } from "@/components/site/neighborhood-options";
import { cn } from "@/lib/utils";

/**
 * Location + date search. A plain GET form to /discover, so it works without JavaScript
 * and produces a shareable URL. No location permission is requested.
 */
export function SearchBar({ className, defaultNear, defaultDate, minDate }: { className?: string; defaultNear?: string; defaultDate?: string; minDate?: string }) {
  return (
    <form
      action="/discover"
      role="search"
      aria-label="Find experiences"
      className={cn(
        "grid gap-2 rounded-[1.4rem] bg-card p-2 shadow-lift ring-1 ring-black/5 sm:grid-cols-[1.3fr_1fr_auto] sm:items-center sm:gap-0 sm:rounded-full",
        className,
      )}
    >
      <label className="flex min-w-0 items-center gap-3 rounded-full px-4 py-2.5 transition-colors focus-within:bg-muted hover:bg-muted/70 sm:py-2">
        <MapPin className="size-4 shrink-0 text-brand" aria-hidden />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[11px] font-semibold tracking-wide text-foreground uppercase">Where</span>
          <select
            name="near"
            defaultValue={defaultNear ?? ""}
            className="-ml-1 w-full cursor-pointer truncate bg-transparent text-sm text-muted-foreground outline-none"
          >
            <option value="">Anywhere in NYC</option>
            <NeighborhoodOptions />
          </select>
        </span>
      </label>
      <label className="flex min-w-0 items-center gap-3 rounded-full px-4 py-2.5 transition-colors focus-within:bg-muted hover:bg-muted/70 sm:border-l sm:py-2">
        <CalendarDays className="size-4 shrink-0 text-brand" aria-hidden />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[11px] font-semibold tracking-wide text-foreground uppercase">When</span>
          <input
            type="date"
            name="date"
            min={minDate}
            defaultValue={defaultDate}
            aria-label="Date"
            className="-ml-0.5 w-full bg-transparent text-sm text-muted-foreground outline-none"
          />
        </span>
      </label>
      <Button type="submit" variant="brand" size="lg" className="h-12 sm:ml-2">
        <Search aria-hidden />
        Search
      </Button>
    </form>
  );
}
