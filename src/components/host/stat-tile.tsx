import { cn } from "@/lib/utils";

/** A KPI tile: label, headline number and a line that explains how it's computed. */
export function StatTile({ label, value, detail, emphasis, className }: { label: string; value: string; detail?: string; emphasis?: boolean; className?: string }) {
  return (
    <div className={cn("rounded-2xl border bg-card p-5 shadow-soft", emphasis && "border-foreground/20", className)}>
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-2 font-display text-3xl tabular-nums">{value}</p>
      {detail && <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{detail}</p>}
    </div>
  );
}

export function SimulatedNote({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <p className={cn("rounded-xl border border-dashed bg-muted/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground", className)}>
      <strong className="font-semibold text-foreground">Simulated data.</strong>{" "}
      {children ?? "Every figure is derived from simulated bookings on fictional sample data. No real money has moved."}
    </p>
  );
}

export function PageHeader({ title, eyebrow, description, actions }: { title: string; eyebrow?: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-4xl">{title}</h1>
        {description && <p className="mt-2 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
