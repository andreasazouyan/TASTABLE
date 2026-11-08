"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import { GUEST_NAV, isActive } from "@/lib/navigation/guest";
import { cn } from "@/lib/utils";

/** Desktop primary navigation. The active tab is a rounded pill, matching the mode switch. */
export function GuestNavLinks({ className }: { className?: string }) {
  return (
    <Suspense fallback={<NavList pathname="" className={className} />}>
      <ActiveNavList className={className} />
    </Suspense>
  );
}

function ActiveNavList({ className }: { className?: string }) {
  return <NavList pathname={usePathname()} className={className} />;
}

function NavList({ pathname, className }: { pathname: string; className?: string }) {
  return (
    <ul className={cn("flex items-center gap-1", className)}>
      {GUEST_NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-9 items-center rounded-full px-3.5 text-sm whitespace-nowrap transition-colors duration-200 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none",
                active ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Bottom tab bar for small screens. */
export function MobileTabBar() {
  return (
    <Suspense fallback={<TabBar pathname="" />}>
      <ActiveTabBar />
    </Suspense>
  );
}

function ActiveTabBar() {
  return <TabBar pathname={usePathname()} />;
}

function TabBar({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="grid grid-cols-5">
        {GUEST_NAV.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors focus-visible:bg-muted focus-visible:outline-none",
                  active ? "text-brand" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2 : 1.5} aria-hidden />
                {item.label.replace("My ", "")}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
