import { formatPercent } from "@/lib/format";

type Cell = { day: string; sessions: number; seatsOffered: number; fillRate: number | null };

/**
 * Day × time-slot demand heatmap. Sequential single hue (terracotta), light → dark by fill rate.
 * Cells with no sessions are blank; cells under the sample threshold are hatched and labelled.
 */
export function DemandHeatmap({ rows, minSessions }: { rows: { slot: string; cells: Cell[] }[]; minSessions: number }) {
  const days = rows[0]?.cells.map((c) => c.day) ?? [];
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[36rem] border-separate border-spacing-[3px] text-xs">
        <caption className="sr-only">Seat fill rate by weekday and time of day. Each cell shows fill rate and number of sessions.</caption>
        <thead>
          <tr>
            <th scope="col" className="w-24" />
            {days.map((d) => (
              <th key={d} scope="col" className="pb-1 font-medium text-muted-foreground">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.slot}>
              <th scope="row" className="pr-2 text-left font-medium text-muted-foreground">
                {r.slot}
              </th>
              {r.cells.map((c) => {
                const small = c.sessions > 0 && c.sessions < minSessions;
                const v = c.fillRate ?? 0;
                const pct = Math.round(15 + v * 85);
                const dark = v >= 0.55 && !small;
                return (
                  <td
                    key={c.day}
                    title={`${c.day} ${r.slot}: ${c.sessions ? `${formatPercent(v)} filled, ${c.sessions} sessions, ${c.seatsOffered} seats` : "no sessions"}`}
                    className="h-14 rounded-md text-center align-middle"
                    style={{
                      background: !c.sessions
                        ? "var(--muted)"
                        : small
                          ? "repeating-linear-gradient(45deg, var(--muted), var(--muted) 4px, var(--card) 4px, var(--card) 8px)"
                          : `color-mix(in oklab, var(--chart-1) ${pct}%, var(--card))`,
                      color: dark ? "#fff" : "var(--foreground)",
                    }}
                  >
                    {c.sessions ? (
                      <>
                        <span className="block font-semibold tabular-nums">{small ? "Low data" : formatPercent(v)}</span>
                        <span className="block opacity-80">{c.sessions} sess.</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">–</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          Fill rate
          <span className="h-2.5 w-32 rounded-full" style={{ background: "linear-gradient(90deg, color-mix(in oklab, var(--chart-1) 15%, var(--card)), var(--chart-1))" }} aria-hidden />
          0% → 100%
        </span>
        <span className="flex items-center gap-2">
          <span
            className="size-3 rounded-sm"
            style={{ background: "repeating-linear-gradient(45deg, var(--muted), var(--muted) 2px, var(--card) 2px, var(--card) 4px)" }}
            aria-hidden
          />
          Fewer than {minSessions} sessions
        </span>
      </div>
    </div>
  );
}
