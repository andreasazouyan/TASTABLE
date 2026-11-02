import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  href,
  linkLabel = "View all",
  className,
  id,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  className?: string;
  id?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 sm:mb-8", className)}>
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h2 id={id} className="text-[1.65rem] leading-tight sm:text-[2rem]">
          {title}
        </h2>
        {description && <p className="mt-2 text-[15px] text-muted-foreground">{description}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="group inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          {linkLabel}
          <ArrowRight className="size-4 transition-transform duration-300 ease-soft group-hover:translate-x-0.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}
