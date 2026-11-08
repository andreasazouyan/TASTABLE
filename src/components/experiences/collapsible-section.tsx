"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Event-page section. On phones and tablets (below `lg`) it is a fold-down: the title is a button and the body
 * unfolds on tap. On desktop it is always open and the title is a plain heading.
 * A link to `#<id>` (e.g. the review sort links) opens it.
 */
export function CollapsibleSection({
  title,
  id,
  defaultOpen = false,
  children,
}: {
  title: string;
  id: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = `${id}-body`;

  useEffect(() => {
    const openIfTargeted = () => {
      if (window.location.hash === `#${id}`) setOpen(true);
    };
    openIfTargeted();
    window.addEventListener("hashchange", openIfTargeted);
    return () => window.removeEventListener("hashchange", openIfTargeted);
  }, [id]);

  return (
    <section className="border-t py-2 first:border-t-0 lg:py-8 lg:first:pt-0" aria-labelledby={id} data-testid={`section-${id}`}>
      <h2 id={id} className="scroll-mt-24 text-2xl">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={bodyId}
          className="flex w-full items-center justify-between gap-3 py-3 text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 lg:pointer-events-none lg:mb-4 lg:cursor-default lg:py-0"
        >
          <span>{title}</span>
          <ChevronDown
            className={cn("size-5 shrink-0 text-muted-foreground transition-transform duration-200 lg:hidden", open && "rotate-180")}
            aria-hidden
          />
        </button>
      </h2>
      <div id={bodyId} className={cn("pb-6 lg:block lg:pb-0", open ? "block" : "hidden")}>
        {children}
      </div>
    </section>
  );
}
