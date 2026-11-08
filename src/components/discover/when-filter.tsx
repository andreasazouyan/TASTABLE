"use client";

import { useState } from "react";

import { WHEN_OPTIONS, type WhenKey } from "@/lib/discovery/dates";
import type { DiscoveryFilters } from "@/lib/discovery/filters";
import { cn } from "@/lib/utils";

/**
 * Quick date chips for the "When" filter. They are radios inside the filters form, so choosing
 * one updates the URL straight away like every other filter. "Choose Dates" reveals the date inputs.
 */
export function WhenFilter({ filters, fieldClass, onClear }: { filters: DiscoveryFilters; fieldClass: string; onClear: (form: HTMLFormElement) => void }) {
  const initial: WhenKey | undefined = filters.when ?? (filters.date || filters.from || filters.to ? "custom" : undefined);
  const [when, setWhen] = useState<WhenKey | undefined>(initial);
  const from = filters.from ?? filters.date;

  return (
    <>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="When">
        {WHEN_OPTIONS.map((o) => {
          const checked = when === o.key;
          return (
            <label
              key={o.key}
              className={cn(
                "inline-flex min-h-9 cursor-pointer items-center rounded-full border px-3.5 py-1.5 text-[13px] transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/40",
                checked ? "border-foreground bg-foreground text-background" : "bg-card hover:border-foreground/30",
              )}
            >
              <input type="radio" name="when" value={o.key} checked={checked} onChange={() => setWhen(o.key)} className="sr-only" />
              {o.label}
            </label>
          );
        })}
      </div>

      {when === "custom" && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-muted-foreground">
            From
            <input type="date" name="from" defaultValue={from} className={cn(fieldClass, "mt-1.5")} />
          </label>
          <label className="text-muted-foreground">
            To
            <input type="date" name="to" defaultValue={filters.to} min={from} className={cn(fieldClass, "mt-1.5")} />
          </label>
          <p className="col-span-2 text-xs text-muted-foreground">Leave &ldquo;To&rdquo; empty for a single day.</p>
        </div>
      )}

      {when && (
        <button
          type="button"
          className="mt-3 text-[13px] text-brand underline-offset-4 hover:underline"
          onClick={(e) => {
            const form = e.currentTarget.form!;
            form.querySelectorAll<HTMLInputElement>('input[name="when"]').forEach((r) => (r.checked = false));
            form.querySelectorAll<HTMLInputElement>('input[name="from"], input[name="to"]').forEach((i) => (i.value = ""));
            setWhen(undefined);
            onClear(form);
          }}
        >
          Clear Dates
        </button>
      )}
    </>
  );
}
