import { Suspense } from "react";

import { GuestNavLinks } from "@/components/site/guest-nav-links";
import { Logo } from "@/components/site/logo";
import { MobileMenu } from "@/components/site/mobile-menu";
import { NotificationBell } from "@/components/site/notification-bell";
import { ModeSwitch } from "@/components/site/mode-switch";
import { UserMenu, UserMenuFallback } from "@/components/site/user-menu";

/**
 * Guest header: logo, primary tabs (Home, Discover, Calendar, Saved, My Bookings), then the
 * mode switch, the notifications bell, and the profile/avatar button kept apart at the far top right.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/88 backdrop-blur-md">
      <div className="container-page flex h-16 items-center gap-4 lg:h-[4.5rem]">
        <Logo />
        <nav aria-label="Primary" className="ml-2 hidden min-w-0 md:block lg:ml-6">
          <GuestNavLinks />
        </nav>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <ModeSwitch mode="guest" className="hidden xl:inline-flex" />
          <MobileMenu />
          <span aria-hidden className="hidden h-6 w-px bg-border md:block" />
          <Suspense fallback={null}>
            <NotificationBell />
          </Suspense>
          <Suspense fallback={<UserMenuFallback className="h-9 w-9 rounded-full bg-muted sm:w-24" />}>
            <UserMenu dropdown />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
