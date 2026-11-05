"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import { FiltersForm } from "@/components/discover/filters-form";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { DiscoveryFilters } from "@/lib/discovery/filters";

export function MobileFilters({
  filters,
  count,
  basePath,
  showSearch,
}: {
  filters: DiscoveryFilters;
  count: number;
  basePath?: string;
  showSearch?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="lg:hidden">
          <SlidersHorizontal aria-hidden />
          Filters{count > 0 && <span className="rounded-full bg-brand px-1.5 text-[11px] text-brand-foreground">{count}</span>}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[92%] overflow-y-auto">
        <SheetHeader className="border-b">
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>Results update as you choose.</SheetDescription>
        </SheetHeader>
        <FiltersForm filters={filters} basePath={basePath} showSearch={showSearch} className="px-5 pb-6" onApplied={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
