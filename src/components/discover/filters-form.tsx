"use client";

import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";

import { WhenFilter } from "@/components/discover/when-filter";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/lib/domain/categories";
import { NEIGHBORHOODS } from "@/lib/domain/neighborhoods";
import { CUISINES, FORMATS, HOST_TYPES, OCCASIONS } from "@/lib/domain/taxonomy";
import type { DiscoveryFilters } from "@/lib/discovery/filters";
import { cn } from "@/lib/utils";

const MULTI = ["category", "cuisine", "host", "occasion", "format"] as const;

/** Turns the form into the same query string a no-JS submit would produce (lists comma-joined). */
function toQuery(form: HTMLFormElement) {
  const fd = new FormData(form);
  const sp = new URLSearchParams();
  for (const key of new Set(fd.keys())) {
    const values = fd.getAll(key).map(String).filter(Boolean);
    if (values.length) sp.set(key, (MULTI as readonly string[]).includes(key) ? values.join(",") : values[0]);
  }
  // A quick date option (Today, Tomorrow…) replaces any chosen dates.
  const when = sp.get("when");
  if (when && when !== "custom") {
    sp.delete("from");
    sp.delete("to");
  }
  return sp.toString();
}

function Fieldset({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-b py-5 first:pt-0 last:border-b-0">
      <legend className="mb-3 text-[13px] font-semibold tracking-wide text-foreground uppercase">{legend}</legend>
      {children}
    </fieldset>
  );
}

function Check({ name, value, label, checked }: { name: string; value: string; label: string; checked: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1 text-sm">
      <input type="checkbox" name={name} value={value} defaultChecked={checked} className="size-4 rounded accent-[var(--brand)]" />
      {label}
    </label>
  );
}

const fieldClass =
  "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25";

/**
 * Discovery filters. Every change updates the URL (shareable). Without JavaScript the
 * Apply button submits the same GET form.
 */
export function FiltersForm({ filters, className, onApplied }: { filters: DiscoveryFilters; className?: string; onApplied?: () => void }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  const push = () => {
    if (!formRef.current) return;
    const qs = toQuery(formRef.current);
    startTransition(() => router.push(qs ? `/discover?${qs}` : "/discover", { scroll: false }));
  };

  return (
    <form
      ref={formRef}
      action="/discover"
      method="get"
      aria-label="Filter experiences"
      aria-busy={pending}
      className={cn("text-sm", className)}
      onChange={push}
      onSubmit={(e) => {
        e.preventDefault();
        push();
        onApplied?.();
      }}
    >
      {filters.q && <input type="hidden" name="q" value={filters.q} />}
      {filters.collection && <input type="hidden" name="collection" value={filters.collection} />}
      {filters.sort && <input type="hidden" name="sort" value={filters.sort} />}

      <Fieldset legend="Location">
        <label className="mb-1.5 block text-muted-foreground" htmlFor="f-near">
          Neighborhood
        </label>
        <select id="f-near" name="near" defaultValue={filters.near ?? ""} className={fieldClass}>
          <option value="">Anywhere in NYC</option>
          {NEIGHBORHOODS.map((n) => (
            <option key={n.key} value={n.key}>
              {n.name} ({n.borough})
            </option>
          ))}
        </select>
        <label className="mt-3 mb-1.5 block text-muted-foreground" htmlFor="f-within">
          Travel distance
        </label>
        <select id="f-within" name="within" defaultValue={filters.within?.toString() ?? ""} className={fieldClass} disabled={!filters.near}>
          <option value="">Any distance</option>
          <option value="1">Within 1 mile</option>
          <option value="2">Within 2 miles</option>
          <option value="5">Within 5 miles</option>
          <option value="10">Within 10 miles</option>
        </select>
        {!filters.near && <p className="mt-1.5 text-xs text-muted-foreground">Choose a neighborhood to filter by distance.</p>}
      </Fieldset>

      <Fieldset legend="When">
        <WhenFilter
          key={[filters.when, filters.date, filters.from, filters.to].join("|")}
          filters={filters}
          fieldClass={fieldClass}
          onClear={() => push()}
        />
      </Fieldset>

      <Fieldset legend="Category">
        {CATEGORIES.map((c) => (
          <Check key={c.id} name="category" value={c.slug} label={c.name} checked={filters.category.includes(c.slug)} />
        ))}
      </Fieldset>

      <Fieldset legend="Social occasion">
        {OCCASIONS.map((o) => (
          <Check key={o.key} name="occasion" value={o.key} label={o.label} checked={filters.occasion.includes(o.key)} />
        ))}
      </Fieldset>

      <Fieldset legend="Ticket price (USD)">
        <div className="grid grid-cols-2 gap-2">
          <label className="text-muted-foreground">
            Min
            <input type="number" inputMode="numeric" name="minPrice" min={0} step={5} placeholder="$0" defaultValue={filters.minPrice} className={cn(fieldClass, "mt-1.5")} />
          </label>
          <label className="text-muted-foreground">
            Max
            <input type="number" inputMode="numeric" name="maxPrice" min={0} step={5} placeholder="Any" defaultValue={filters.maxPrice} className={cn(fieldClass, "mt-1.5")} />
          </label>
        </div>
      </Fieldset>

      <Fieldset legend="Available spots">
        <select name="spots" aria-label="Minimum available spots" defaultValue={filters.spots?.toString() ?? ""} className={fieldClass}>
          <option value="">Any availability</option>
          <option value="1">At least 1 spot</option>
          <option value="2">At least 2 spots</option>
          <option value="4">At least 4 spots</option>
          <option value="6">At least 6 spots</option>
        </select>
      </Fieldset>

      <Fieldset legend="Cuisine">
        <div className="grid grid-cols-2 gap-x-3">
          {CUISINES.map((c) => (
            <Check key={c.key} name="cuisine" value={c.key} label={c.label} checked={filters.cuisine.includes(c.key)} />
          ))}
        </div>
      </Fieldset>

      <Fieldset legend="Host type">
        {Object.entries(HOST_TYPES).map(([key, h]) => (
          <Check key={key} name="host" value={key} label={h.label} checked={filters.host.includes(key as never)} />
        ))}
      </Fieldset>

      <Fieldset legend="Event format">
        {Object.entries(FORMATS).map(([key, label]) => (
          <Check key={key} name="format" value={key} label={label} checked={filters.format.includes(key as never)} />
        ))}
      </Fieldset>

      <div className="sticky bottom-0 flex gap-2 bg-gradient-to-t from-background via-background to-transparent pt-4 pb-1">
        <Button type="submit" className="flex-1">
          {pending ? "Updating…" : "Apply filters"}
        </Button>
        <Button type="button" variant="outline" onClick={() => startTransition(() => { router.push("/discover"); onApplied?.(); })}>
          Clear
        </Button>
      </div>
    </form>
  );
}
