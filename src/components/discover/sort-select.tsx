"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { SORTS, type SortKey } from "@/lib/discovery/filters";

export function SortSelect({ value }: { value: SortKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      Sort
      <select
        value={value}
        onChange={(e) => {
          const sp = new URLSearchParams(search);
          if (e.target.value === "recommended") sp.delete("sort");
          else sp.set("sort", e.target.value);
          router.push(`${pathname}${sp.size ? `?${sp}` : ""}`, { scroll: false });
        }}
        className="h-10 rounded-full border border-input bg-card px-3 text-sm text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
      >
        {SORTS.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </select>
    </label>
  );
}
