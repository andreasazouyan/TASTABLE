import type { Metadata } from "next";
import { Suspense } from "react";

import { HostNav } from "@/components/host/host-nav";
import { DemoBanner } from "@/components/site/demo-banner";
import { Logo } from "@/components/site/logo";
import { ModeSwitch } from "@/components/site/mode-switch";
import { UserMenu, UserMenuFallback } from "@/components/site/user-menu";

export const metadata: Metadata = { title: { default: "Host", template: "%s · Host · Tastable" } };

export default function HostLayout({ children }: LayoutProps<"/host">) {
  return (
    <>
      <DemoBanner />
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[90rem] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo href="/host" />
            <span className="rounded-full bg-foreground px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-background uppercase">Host</span>
          </div>
          <div className="flex items-center gap-3">
            <ModeSwitch mode="host" />
            <div className="hidden sm:block">
              <Suspense fallback={<UserMenuFallback />}>
                <UserMenu />
              </Suspense>
            </div>
          </div>
        </div>
        <div className="border-t px-4 py-2 lg:hidden">
          <HostNav orientation="horizontal" />
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-[90rem] flex-1 gap-8 px-4 sm:px-6">
        <aside className="hidden w-56 shrink-0 py-8 lg:block">
          <div className="sticky top-24">
            <HostNav orientation="vertical" />
            <p className="mt-8 px-3 text-xs text-muted-foreground">All figures come from simulated transactions on fictional sample data.</p>
          </div>
        </aside>
        <main id="main" className="min-w-0 flex-1 py-8 pb-16">
          {children}
        </main>
      </div>
    </>
  );
}
