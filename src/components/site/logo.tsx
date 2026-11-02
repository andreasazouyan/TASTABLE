import Link from "next/link";

import { cn } from "@/lib/utils";

/** Tastable wordmark. The terracotta dot is the brand mark. */
export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      aria-label="Tastable home"
      className={cn(
        "inline-flex items-baseline gap-0.5 rounded-md font-display text-[1.6rem] leading-none font-medium tracking-tight text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none",
        className,
      )}
    >
      Tastable
      <span aria-hidden className="inline-block size-[7px] translate-y-[-1px] rounded-full bg-brand" />
    </Link>
  );
}
