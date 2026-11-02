import { Suspense } from "react";

import { GuestNavLinks } from "@/components/site/guest-nav-links";
import { Logo } from "@/components/site/logo";
import { MobileMenu } from "@/components/site/mobile-menu";
import { ModeSwitch } from "@/components/site/mode-switch";
import { UserMenu, UserMenuFallback } from "@/components/site/user-menu";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/88 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4 lg:h-[4.5rem]">
        <div className="flex items-center gap-8">
          <Logo />
          <nav aria-label="Primary" className="hidden md:block">
            <GuestNavLinks />
          </nav>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <ModeSwitch mode="guest" className="hidden lg:inline-flex" />
          <div className="hidden sm:block">
            <Suspense fallback={<UserMenuFallback />}>
              <UserMenu />
            </Suspense>
          </div>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
