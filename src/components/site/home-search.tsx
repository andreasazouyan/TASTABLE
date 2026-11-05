import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Home's one-line search. A plain GET form to /discover?q=, so it works without JavaScript and
 * gives a shareable URL. Discover matches titles, categories, cuisines, hosts and neighborhoods.
 */
export function HomeSearch({ className }: { className?: string }) {
  return (
    <form
      action="/discover"
      role="search"
      aria-label="Search experiences"
      className={cn("flex items-center gap-2 rounded-full border bg-card p-1.5 pl-4 shadow-soft focus-within:ring-[3px] focus-within:ring-ring/30", className)}
    >
      <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <label htmlFor="home-q" className="sr-only">
        Search experiences
      </label>
      <input
        id="home-q"
        name="q"
        type="search"
        maxLength={80}
        autoComplete="off"
        placeholder="Search experiences, cuisines, neighborhoods..."
        className="h-10 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
      />
      <Button type="submit" variant="brand" className="h-10 shrink-0 rounded-full px-4 sm:px-6">
        Search
      </Button>
    </form>
  );
}
