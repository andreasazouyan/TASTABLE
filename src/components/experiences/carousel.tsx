"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Horizontal, snap-scrolling card carousel used on Home at every screen size. Touch and trackpad
 * scroll natively; from md up, previous/next buttons page by the visible width.
 */
export function Carousel({ children, label, className }: { children: React.ReactNode; label: string; className?: string }) {
  const ref = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [update]);

  const page = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div className={cn("relative", className)}>
      <ul
        ref={ref}
        aria-label={label}
        onScroll={update}
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:gap-5 sm:px-6 lg:mx-0 lg:scroll-px-0 lg:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </ul>
      {!(edges.start && edges.end) && (
        <div className="pointer-events-none absolute inset-x-0 top-[calc(min(36vw,13rem)/2)] hidden justify-between md:flex lg:-inset-x-5">
          <CarouselButton label={`Previous ${label}`} disabled={edges.start} onClick={() => page(-1)}>
            <ChevronLeft className="size-5" aria-hidden />
          </CarouselButton>
          <CarouselButton label={`Next ${label}`} disabled={edges.end} onClick={() => page(1)}>
            <ChevronRight className="size-5" aria-hidden />
          </CarouselButton>
        </div>
      )}
    </div>
  );
}

function CarouselButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="pointer-events-auto grid size-10 place-items-center rounded-full border bg-card/95 text-foreground shadow-soft backdrop-blur transition-opacity duration-200 hover:bg-card focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none disabled:opacity-0"
    >
      {children}
    </button>
  );
}

export function CarouselItem({ children }: { children: React.ReactNode }) {
  return <li className="w-[78%] shrink-0 snap-start sm:w-[44%] md:w-[31%] lg:w-[calc((100%-3.75rem)/4)]">{children}</li>;
}
