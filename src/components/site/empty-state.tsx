import type { LucideIcon } from "lucide-react";
import { SearchX } from "lucide-react";

import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon = SearchX,
  title,
  description,
  children,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-2xl border border-dashed bg-card/60 px-6 py-14 text-center", className)}>
      <span className="mb-4 grid size-12 place-items-center rounded-full bg-brand-soft text-accent-foreground">
        <Icon className="size-5" aria-hidden />
      </span>
      <h2 className="font-display text-xl">{title}</h2>
      {description && <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>}
      {children && <div className="mt-6 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}
