import { formatDate, formatDuration, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export type TimelineStep = { startOffsetMinutes: number; durationMinutes: number | null; title: string; description: string };

function offsetLabel(minutes: number) {
  if (minutes === 0) return "Start";
  return `+${formatDuration(minutes)}`;
}

/**
 * "Your Experience": the run of show as a vertical timeline. Steps are stored as minutes from the
 * session start, so the same itinerary fits every date. With a session, clock times are shown in
 * the event's timezone (New York); without one, offsets from the start.
 */
export function ExperienceTimeline({ steps, startsAt, className }: { steps: TimelineStep[]; startsAt?: Date | null; className?: string }) {
  if (!steps.length) return null;
  const at = (offset: number) => (startsAt ? formatTime(new Date(startsAt.getTime() + offset * 60_000)) : offsetLabel(offset));
  return (
    <div className={className}>
      <ol className="relative">
        {steps.map((s, i) => {
          const last = i === steps.length - 1;
          return (
            <li key={`${s.title}-${i}`} className="relative grid grid-cols-[5.5rem_1fr] gap-4 pb-6 last:pb-0">
              <p className="pt-0.5 text-right text-sm font-medium tabular-nums">
                {at(s.startOffsetMinutes)}
                {s.durationMinutes ? <span className="block text-xs font-normal text-muted-foreground">{formatDuration(s.durationMinutes)}</span> : null}
              </p>
              <div className="relative pl-6">
                <span aria-hidden className="absolute top-1.5 left-0 size-2.5 rounded-full bg-brand ring-4 ring-brand-soft" />
                {!last && <span aria-hidden className={cn("absolute top-4 bottom-[-1.5rem] left-[4.5px] w-px bg-border")} />}
                <p className="font-medium">{s.title}</p>
                {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-xs text-muted-foreground">
        {startsAt
          ? `Times for the ${formatDate(startsAt, { weekday: "long", month: "long", day: "numeric" })} session, New York time. Timings are approximate.`
          : "Times are shown from the start of the event. Timings are approximate."}
      </p>
    </div>
  );
}
