"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Popover } from "radix-ui";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";

import { cn } from "@/lib/utils";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function parts(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}
const iso = (y: number, m0: number, d: number) => new Date(Date.UTC(y, m0, d)).toISOString().slice(0, 10);
const monthOf = (d: string) => d.slice(0, 7);
function addMonths(month: string, n: number) {
  const { y, m } = parts(`${month}-01`);
  return iso(y, m - 1 + n, 1).slice(0, 7);
}
function label(d: string, withWeekday: boolean) {
  const { y, m, d: day } = parts(d);
  return new Date(Date.UTC(y, m - 1, day, 12)).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", ...(withWeekday ? { weekday: "short" } : {}) });
}

/** "Tue, Nov 10" or "Nov 10 – Nov 14"; null when no date is chosen. */
export function dateRangeLabel(start?: string, end?: string) {
  if (!start) return null;
  return end && end > start ? `${label(start, false)} – ${label(end, false)}` : label(start, true);
}

/**
 * Discover's date picker: a "Select dates" button that opens a month calendar. The first tap
 * picks a single day (`?date=`); a later day extends it to a range (`?from=&to=`). Results update
 * on every tap, every other filter in the URL is kept, and "Clear dates" shows all upcoming dates.
 */
export function DateRangePicker({ start, end, today, className }: { start?: string; end?: string; today: string; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(monthOf(end ?? start ?? today));
  const [pending, startTransition] = useTransition();
  const [sel, setSel] = useState<{ start?: string; end?: string }>({ start, end });
  const [hover, setHover] = useState<string | null>(null);
  // Follow the URL when it changes elsewhere (calendar link, removing the chip, Clear all).
  const urlKey = `${start ?? ""}|${end ?? ""}`;
  const [seenKey, setSeenKey] = useState(urlKey);
  if (seenKey !== urlKey) {
    setSeenKey(urlKey);
    setSel({ start, end });
    if (start) setMonth(monthOf(end ?? start));
  }

  const apply = (next: { start?: string; end?: string }) => {
    setSel(next);
    // The URL will follow this choice; don't treat it as an outside change (keeps the month in view).
    setSeenKey(`${next.start ?? ""}|${next.end && next.start && next.end > next.start ? next.end : ""}`);
    const sp = new URLSearchParams(search);
    for (const k of ["date", "from", "to", "when"]) sp.delete(k);
    if (next.start && next.end && next.end > next.start) {
      sp.set("from", next.start);
      sp.set("to", next.end);
    } else if (next.start) sp.set("date", next.start);
    startTransition(() => router.push(`${pathname}${sp.size ? `?${sp}` : ""}`, { scroll: false }));
  };

  const pick = (d: string) => {
    // A second, later day turns a single date into a range; anything else starts over.
    if (sel.start && !sel.end && d > sel.start) apply({ start: sel.start, end: d });
    else apply({ start: d });
  };

  const weeks = useMemo(() => {
    const { y, m } = parts(`${month}-01`);
    const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const cells: (string | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => iso(y, m - 1, i + 1))];
    while (cells.length % 7) cells.push(null);
    return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
  }, [month]);

  const text = dateRangeLabel(start, end);
  const previewEnd = sel.start && !sel.end && hover && hover > sel.start ? hover : sel.end;
  const { y, m } = parts(`${month}-01`);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div className={cn("inline-flex items-center", className)}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30",
              text ? "border-foreground bg-foreground text-background" : "border-input bg-card text-foreground hover:border-foreground/30",
              text && "rounded-r-none pr-3",
            )}
            aria-label={text ? `Dates: ${text}. Change dates` : "Select dates"}
            aria-busy={pending}
          >
            <CalendarDays className="size-4" aria-hidden />
            <span className="whitespace-nowrap">{text ?? "Select dates"}</span>
          </button>
        </Popover.Trigger>
        {text && (
          <button
            type="button"
            onClick={() => apply({})}
            className="inline-flex h-10 items-center rounded-r-full border border-l-0 border-foreground bg-foreground pr-3 pl-1.5 text-background/80 hover:text-background focus-visible:ring-[3px] focus-visible:ring-ring/30 focus-visible:outline-none"
            aria-label="Clear dates"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="z-50 w-[19.5rem] rounded-2xl border bg-card p-4 text-foreground shadow-lift outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          aria-label="Choose a date or a date range"
        >
          <div className="mb-3 flex items-center justify-between">
            <button type="button" className="inline-grid size-8 place-items-center rounded-full hover:bg-muted disabled:opacity-30" onClick={() => setMonth(addMonths(month, -1))} disabled={month <= monthOf(today)} aria-label="Previous month">
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <p className="font-display text-lg" aria-live="polite">
              {MONTHS[m - 1]} {y}
            </p>
            <button type="button" className="inline-grid size-8 place-items-center rounded-full hover:bg-muted" onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month">
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>
          <table className="w-full border-collapse text-center text-sm" role="grid" onMouseLeave={() => setHover(null)}>
            <thead>
              <tr>
                {DOW.map((d) => (
                  <th key={d} scope="col" className="pb-1 text-[11px] font-medium text-muted-foreground">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((w, i) => (
                <tr key={i}>
                  {w.map((d, j) => {
                    if (!d) return <td key={j} />;
                    const past = d < today;
                    const isStart = d === sel.start;
                    const isEnd = !!previewEnd && d === previewEnd;
                    const inRange = !!sel.start && !!previewEnd && d > sel.start && d < previewEnd;
                    const edge = isStart || isEnd;
                    return (
                      <td key={j} className="p-0">
                        <div
                          className={cn(
                            "py-0.5",
                            inRange && "bg-brand-soft",
                            isStart && previewEnd && previewEnd > d && "bg-gradient-to-r from-transparent from-50% to-brand-soft to-50%",
                            isEnd && sel.start && d > sel.start && "bg-gradient-to-l from-transparent from-50% to-brand-soft to-50%",
                          )}
                        >
                          <button
                            type="button"
                            disabled={past}
                            onClick={() => pick(d)}
                            onMouseEnter={() => setHover(d)}
                            aria-pressed={edge || inRange}
                            aria-label={new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                            className={cn(
                              "mx-auto grid size-9 place-items-center rounded-full tabular-nums transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40",
                              past ? "cursor-not-allowed text-muted-foreground/40" : "hover:bg-muted",
                              d === today && !edge && "font-semibold underline decoration-brand underline-offset-4",
                              edge && "bg-foreground font-medium text-background hover:bg-foreground",
                              inRange && "hover:bg-brand-soft",
                            )}
                          >
                            {Number(d.slice(8))}
                          </button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted-foreground">
            {sel.start && !sel.end ? "Showing one day. Tap a later date to make it a range." : "Tap a day, or tap two days for a range."}
          </p>
          <div className="mt-3 flex items-center justify-between border-t pt-3">
            <button type="button" className="text-sm text-brand underline-offset-4 hover:underline disabled:opacity-40" onClick={() => apply({})} disabled={!sel.start}>
              Clear dates
            </button>
            <Popover.Close className="inline-flex h-9 items-center rounded-full bg-foreground px-4 text-sm text-background">Done</Popover.Close>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
