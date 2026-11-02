import Link from "next/link";

import { cn } from "@/lib/utils";

/** Guest / Host mode switch. Host mode lives under /host with its own shell. */
export function ModeSwitch({ mode, className }: { mode: "guest" | "host"; className?: string }) {
  const item = (target: "guest" | "host", href: string, label: string) => (
    <Link
      href={href}
      aria-current={mode === target ? "page" : undefined}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-200 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none",
        mode === target ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
  return (
    <nav aria-label="Switch mode" className={cn("inline-flex rounded-full bg-muted p-1", className)}>
      {item("guest", "/", "Guest")}
      {item("host", "/host", "Host")}
    </nav>
  );
}
