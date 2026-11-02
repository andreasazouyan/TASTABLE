"use client";

import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/**
 * Chart conventions (see the dataviz palette): chart-1 terracotta for single series,
 * fixed categorical order chart-1..4, thin marks, recessive axes, one y-axis per chart,
 * tooltip on hover, legend only for 2+ series. Every chart has a table/summary nearby.
 */
const AXIS = { stroke: "var(--muted-foreground)", fontSize: 12, tickLine: false, axisLine: false } as const;
const GRID = { stroke: "var(--border)", strokeDasharray: "0", vertical: false } as const;

type TooltipRow = { name?: string | number; value?: number | string; color?: string; dataKey?: string | number };
function ChartTooltip({ active, payload, label, format }: { active?: boolean; payload?: TooltipRow[]; label?: string | number; format: (v: number, key: string) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-lift">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="flex items-center gap-2 text-muted-foreground">
          <span className="size-2 rounded-full" style={{ background: p.color }} aria-hidden />
          {p.name}: <span className="font-medium text-foreground tabular-nums">{format(Number(p.value), String(p.dataKey))}</span>
        </p>
      ))}
    </div>
  );
}

const usd = (v: number) => `$${v.toLocaleString("en-US")}`;

export function RevenueChart({ data, label = "Net ticket revenue" }: { data: { label: string; revenue: number }[]; label?: string }) {
  return (
    <div className="h-64 w-full" role="img" aria-label={`${label} bar chart. Values are listed in the table below.`}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={2}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="label" {...AXIS} minTickGap={16} />
          <YAxis {...AXIS} width={56} tickFormatter={usd} />
          <Tooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltip format={(v) => usd(v)} />} />
          <Bar isAnimationActive={false} dataKey="revenue" name={label} fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BookingTrendChart({ data }: { data: { label: string; bookings: number; cancellations: number }[] }) {
  return (
    <div className="h-64 w-full" role="img" aria-label="Bookings and cancellations over time, line chart.">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="label" {...AXIS} minTickGap={16} />
          <YAxis {...AXIS} width={40} allowDecimals={false} />
          <Tooltip cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }} content={<ChartTooltip format={(v) => String(v)} />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          <Line isAnimationActive={false} dataKey="bookings" name="Bookings" stroke="var(--chart-1)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          <Line isAnimationActive={false} dataKey="cancellations" name="Cancellations" stroke="var(--chart-2)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Horizontal bars, one series. `format` controls the tooltip and axis. */
export function HorizontalBars({
  data,
  dataKey,
  name,
  format = "number",
  height,
  fixedDomain = true,
}: {
  fixedDomain?: boolean;
  data: { label: string; [k: string]: string | number | null }[];
  dataKey: string;
  name: string;
  format?: "number" | "percent" | "usd";
  height?: number;
}) {
  const fmt = (v: number) => (format === "percent" ? `${(v * 100).toFixed(fixedDomain ? 0 : 1)}%` : format === "usd" ? usd(v) : v.toLocaleString("en-US"));
  return (
    <div className="w-full" style={{ height: height ?? Math.max(160, data.length * 36 + 40) }} role="img" aria-label={`${name} by item. Values are listed in the table.`}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }} barCategoryGap={6}>
          <CartesianGrid {...GRID} vertical horizontal={false} />
          <XAxis type="number" {...AXIS} tickFormatter={fmt} domain={format === "percent" && fixedDomain ? [0, 1] : [0, "auto"]} />
          <YAxis type="category" dataKey="label" {...AXIS} width={190} tick={{ fontSize: 12, fill: "var(--foreground)" }} />
          <Tooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltip format={(v) => fmt(v)} />} />
          <Bar isAnimationActive={false} dataKey={dataKey} name={name} fill="var(--chart-1)" radius={[0, 4, 4, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Two measures on the same 0–100% scale, grouped. */
export function GroupedPercentBars({ data, series }: { data: { label: string; [k: string]: string | number | null }[]; series: { key: string; name: string }[] }) {
  const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];
  const fmt = (v: number) => `${Math.round(v * 100)}%`;
  return (
    <div className="h-64 w-full" role="img" aria-label={`${series.map((s) => s.name).join(" and ")} by group. Values are listed in the table.`}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="label" {...AXIS} interval={0} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
          <YAxis {...AXIS} width={44} tickFormatter={fmt} domain={[0, 1]} />
          <Tooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltip format={(v) => fmt(v)} />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          {series.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} name={s.name} fill={colors[i]} radius={[4, 4, 0, 0]} maxBarSize={26} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
