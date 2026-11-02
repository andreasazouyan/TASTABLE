"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import { HOST_NAV, isHostActive } from "@/lib/navigation/host";
import { cn } from "@/lib/utils";

function Nav({ pathname, orientation }: { pathname: string; orientation: "vertical" | "horizontal" }) {
  return (
    <ul className={cn(orientation === "vertical" ? "space-y-1" : "flex gap-1 overflow-x-auto [scrollbar-width:none]")}>
      {HOST_NAV.map((item) => {
        const active = isHostActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <li key={item.href} className="shrink-0">
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none",
                orientation === "horizontal" && "rounded-full px-3.5 py-2",
                active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function ActiveNav({ orientation }: { orientation: "vertical" | "horizontal" }) {
  return <Nav pathname={usePathname()} orientation={orientation} />;
}

export function HostNav({ orientation }: { orientation: "vertical" | "horizontal" }) {
  return (
    <nav aria-label="Host">
      <Suspense fallback={<Nav pathname="" orientation={orientation} />}>
        <ActiveNav orientation={orientation} />
      </Suspense>
    </nav>
  );
}
