import { DemoBanner } from "@/components/site/demo-banner";
import { MobileTabBar } from "@/components/site/guest-nav-links";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

export default function GuestLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <DemoBanner />
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <MobileTabBar />
    </>
  );
}
