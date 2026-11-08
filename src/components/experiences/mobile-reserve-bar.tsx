"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Phone/tablet only (below `lg`): a bar pinned above the tab bar with the price and the orange
 * "Reserve your spot" button, so guests never have to scroll to the booking card to start reserving.
 * Tapping it brings the booking card (date, seats — including any per-event seat cap — and the real Reserve button)
 * into view. The bar hides itself while that card is on screen or already scrolled past.
 */
export function MobileReserveBar({
  targetId,
  priceLabel,
  priceSuffix,
  note,
  label,
}: {
  /** id of the booking card to scroll to. */
  targetId: string;
  priceLabel: string;
  priceSuffix?: string;
  note?: string;
  label: string;
}) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Visible, or already above the viewport: the guest is at (or past) the booking card.
        setHidden(entry.isIntersecting || entry.boundingClientRect.top < 0);
      },
      { threshold: 0.15 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetId]);

  const goToBooking = () => {
    const target = document.getElementById(targetId);
    if (!target) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    target.querySelector<HTMLElement>("input:checked, a, button")?.focus({ preventScroll: true });
  };

  return (
    <div
      data-testid="mobile-reserve-bar"
      aria-hidden={hidden}
      className={cn(
        // Sits on top of the phone tab bar (md:hidden, ~3.65rem tall) and at the very bottom from md up to lg.
        "fixed inset-x-0 bottom-[calc(3.65rem+env(safe-area-inset-bottom))] z-40 border-t bg-background/95 px-4 py-3 shadow-[0_-8px_24px_-12px_rgb(0_0_0/0.18)] backdrop-blur-md transition-[transform,opacity] duration-200 md:bottom-0 md:pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden",
        hidden && "pointer-events-none translate-y-4 opacity-0",
      )}
    >
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="leading-tight">
            <span className="font-display text-xl">{priceLabel}</span>
            {priceSuffix && <span className="text-sm text-muted-foreground"> {priceSuffix}</span>}
          </p>
          {note && <p className="truncate text-xs font-medium text-accent-foreground">{note}</p>}
        </div>
        <Button type="button" variant="brand" size="lg" className="shrink-0" onClick={goToBooking} tabIndex={hidden ? -1 : undefined}>
          {label}
        </Button>
      </div>
    </div>
  );
}
