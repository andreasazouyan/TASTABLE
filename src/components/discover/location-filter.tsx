"use client";

import { useState } from "react";
import { flushSync } from "react-dom";
import { ChevronDown } from "lucide-react";

import { BOROUGHS, boroughKeyOf, getNeighborhood, neighborhoodsIn, type BoroughKey } from "@/lib/domain/neighborhoods";
import type { DiscoveryFilters } from "@/lib/discovery/filters";
import { cn } from "@/lib/utils";

/**
 * Borough → neighborhood filter. Choosing a borough opens its neighborhoods; with none ticked the
 * whole borough is searched. Every change updates the URL through the surrounding form.
 */
export function LocationFilter({ filters, onChanged }: { filters: DiscoveryFilters; onChanged: () => void }) {
  const fromHoods = filters.neighborhood.map((k) => getNeighborhood(k)).filter((n) => !!n);
  const [boroughs, setBoroughs] = useState<BoroughKey[]>(() => {
    const set = new Set<BoroughKey>([...(filters.borough as BoroughKey[]), ...fromHoods.map(boroughKeyOf)]);
    return BOROUGHS.map((b) => b.key).filter((k) => set.has(k));
  });
  const [hoods, setHoods] = useState<string[]>(filters.neighborhood);

  // Bulk changes re-render first so the form reads the new checkboxes, then update the URL.
  const commit = (next: string[]) => {
    flushSync(() => setHoods(next));
    onChanged();
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Boroughs">
        {BOROUGHS.map((b) => {
          const on = boroughs.includes(b.key);
          return (
            <label
              key={b.key}
              className={cn(
                "inline-flex min-h-9 cursor-pointer items-center rounded-full border px-3.5 py-1.5 text-[13px] transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/40",
                on ? "border-foreground bg-foreground text-background" : "bg-card hover:border-foreground/30",
              )}
            >
              <input
                type="checkbox"
                name="borough"
                value={b.key}
                checked={on}
                onChange={() => {
                  setBoroughs(on ? boroughs.filter((x) => x !== b.key) : BOROUGHS.map((x) => x.key).filter((k) => k === b.key || boroughs.includes(k)));
                  if (on) setHoods(hoods.filter((h) => boroughKeyOf(getNeighborhood(h)!) !== b.key));
                }}
                className="sr-only"
              />
              {b.name}
            </label>
          );
        })}
      </div>

      {boroughs.map((bk) => {
        const borough = BOROUGHS.find((b) => b.key === bk)!;
        const list = neighborhoodsIn(bk);
        const chosen = list.filter((n) => hoods.includes(n.key));
        return (
          <details key={bk} open className="group mt-3 rounded-xl border bg-card">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-[13px] font-medium [&::-webkit-details-marker]:hidden">
              <span>
                {borough.name} neighborhoods
                <span className="ml-1.5 font-normal text-muted-foreground">{chosen.length ? `${chosen.length} selected` : "All"}</span>
              </span>
              <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="border-t px-3 pt-2 pb-3">
              <div className="mb-1.5 flex gap-3 text-[13px]">
                <button type="button" className="text-brand underline-offset-4 hover:underline" onClick={() => commit([...hoods.filter((h) => !list.some((n) => n.key === h)), ...list.map((n) => n.key)])}>
                  Select all
                  <span className="sr-only"> in {borough.name}</span>
                </button>
                <button
                  type="button"
                  className="text-brand underline-offset-4 hover:underline disabled:text-muted-foreground disabled:no-underline"
                  disabled={!chosen.length}
                  onClick={() => commit(hoods.filter((h) => !list.some((n) => n.key === h)))}
                >
                  Clear
                  <span className="sr-only"> {borough.name} neighborhoods</span>
                </button>
              </div>
              <ul className="max-h-60 overflow-y-auto pr-1 [scrollbar-width:thin]" aria-label={`${borough.name} neighborhoods`}>
                {list.map((n) => {
                  const on = hoods.includes(n.key);
                  return (
                    <li key={n.key}>
                      <label className="flex cursor-pointer items-center gap-2.5 py-1 text-sm">
                        <input
                          type="checkbox"
                          name="neighborhood"
                          value={n.key}
                          checked={on}
                          onChange={() => setHoods(on ? hoods.filter((h) => h !== n.key) : [...hoods, n.key])}
                          className="size-4 rounded accent-[var(--brand)]"
                        />
                        {n.name}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          </details>
        );
      })}
    </div>
  );
}
