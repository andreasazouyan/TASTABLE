"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { cn } from "@/lib/utils";

export type PerformanceRow = {
  sessionId: string;
  event: string;
  startsAt: string;
  dateLabel: string;
  status: string;
  capacity: number;
  ticketsSold: number;
  occupancy: number;
  revenueCents: number;
  cancellations: number;
};

type Key = "event" | "startsAt" | "capacity" | "ticketsSold" | "occupancy" | "revenueCents" | "cancellations";
const COLS: { key: Key; label: string; numeric?: boolean }[] = [
  { key: "event", label: "Event" },
  { key: "startsAt", label: "Date" },
  { key: "capacity", label: "Capacity", numeric: true },
  { key: "ticketsSold", label: "Sold", numeric: true },
  { key: "occupancy", label: "Occupancy", numeric: true },
  { key: "revenueCents", label: "Net revenue", numeric: true },
  { key: "cancellations", label: "Cancellations", numeric: true },
];

const money = (c: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(c / 100);

export function PerformanceTable({ rows }: { rows: PerformanceRow[] }) {
  const [sort, setSort] = useState<{ key: Key; dir: "asc" | "desc" }>({ key: "startsAt", dir: "desc" });
  const sorted = useMemo(() => {
    const r = [...rows].sort((a, b) => {
      const x = a[sort.key];
      const y = b[sort.key];
      const cmp = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return r;
  }, [rows, sort]);

  if (!rows.length) return <p className="py-8 text-center text-sm text-muted-foreground">No event dates in this period.</p>;

  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[46rem] text-sm">
        <caption className="sr-only">Event performance. Select a column header to sort.</caption>
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            {COLS.map((c) => {
              const active = sort.key === c.key;
              const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
              return (
                <th key={c.key} scope="col" aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} className={cn("px-3 py-2 font-medium", c.numeric && "text-right")}>
                  <button
                    type="button"
                    onClick={() => setSort({ key: c.key, dir: active && sort.dir === "desc" ? "asc" : "desc" })}
                    className={cn("inline-flex items-center gap-1 rounded hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none", active && "text-foreground")}
                  >
                    {c.label}
                    <Icon className="size-3" aria-hidden />
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.sessionId} className="border-b last:border-0">
              <td className="max-w-64 truncate px-3 py-2.5 font-medium">
                {r.event}
                {r.status === "CANCELLED" && <span className="ml-2 rounded-full bg-foreground px-2 py-0.5 text-[10px] text-background">Cancelled</span>}
              </td>
              <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{r.dateLabel}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{r.capacity}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{r.ticketsSold}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{Math.round(r.occupancy * 100)}%</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{money(r.revenueCents)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{r.cancellations}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
