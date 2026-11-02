"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CATEGORIES } from "@/lib/domain/categories";
import { GUEST_NAV, isActive } from "@/lib/navigation/guest";
import { cn } from "@/lib/utils";

export function MobileMenu() {
  return (
    <Suspense fallback={<Menu_ pathname="" />}>
      <ActiveMenu />
    </Suspense>
  );
}

function ActiveMenu() {
  return <Menu_ pathname={usePathname()} />;
}

function Menu_({ pathname }: { pathname: string }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader className="border-b">
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription>Discover experiences worth sharing.</SheetDescription>
        </SheetHeader>
        <nav aria-label="Mobile" className="flex flex-col gap-8 px-5 pb-8">
          <div className="inline-flex self-start rounded-full bg-muted p-1 text-[13px] font-medium">
            <SheetClose asChild>
              <Link href="/" className="rounded-full bg-card px-3.5 py-1.5 shadow-soft" aria-current="page">
                Guest
              </Link>
            </SheetClose>
            <SheetClose asChild>
              <Link href="/host" className="rounded-full px-3.5 py-1.5 text-muted-foreground">
                Host
              </Link>
            </SheetClose>
          </div>
          <ul className="flex flex-col">
            {GUEST_NAV.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <SheetClose asChild>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 border-b py-3.5 text-base",
                        active ? "text-brand" : "text-foreground",
                      )}
                    >
                      <Icon className="size-5" strokeWidth={1.5} aria-hidden />
                      {item.label}
                    </Link>
                  </SheetClose>
                </li>
              );
            })}
          </ul>
          <div>
            <p className="eyebrow mb-3">Categories</p>
            <ul className="flex flex-col gap-2.5">
              {CATEGORIES.map((c) => (
                <li key={c.id}>
                  <SheetClose asChild>
                    <Link href={`/discover?category=${c.slug}`} className="text-sm text-muted-foreground hover:text-foreground">
                      {c.name}
                    </Link>
                  </SheetClose>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
