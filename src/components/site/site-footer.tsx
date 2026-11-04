import Link from "next/link";

import { Logo } from "@/components/site/logo";
import { CATEGORIES } from "@/lib/domain/categories";

const columns = [
  {
    title: "Explore",
    links: CATEGORIES.map((c) => ({ href: `/discover?category=${c.slug}`, label: c.shortName === "Social" ? "Social Experiences" : c.shortName })),
  },
  {
    title: "Guests",
    links: [
      { href: "/discover", label: "Discover" },
      { href: "/calendar", label: "Calendar" },
      { href: "/bookings", label: "My Bookings" },
      { href: "/saved", label: "Saved" },
    ],
  },
  {
    title: "Hosts",
    links: [
      { href: "/host", label: "Host dashboard" },
      { href: "/about#hosting", label: "Why host on Tastable" },
    ],
  },
  {
    title: "Tastable",
    links: [
      { href: "/about", label: "About this prototype" },
      { href: "/about#cancellations", label: "Cancellation policies" },
      { href: "/about#photography", label: "Photo credits" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t bg-card/60 pb-24 md:pb-0">
      <div className="container-page grid gap-12 py-14 lg:grid-cols-[1.2fr_2fr]">
        <div className="max-w-sm space-y-4">
          <Logo />
          <p className="font-display text-xl leading-snug text-foreground/90">Discover experiences worth sharing.</p>
          <p className="text-sm text-muted-foreground">
            A curated marketplace for supper clubs, classes, pop-ups and social culinary experiences.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {columns.map((col) => (
            <div key={col.title}>
              <h2 className="mb-4 font-sans text-xs font-semibold tracking-[0.14em] text-foreground uppercase">{col.title}</h2>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>Tastable prototype. Sample data only, payments are simulated and no card details are collected.</p>
          <p>Event images by Tastable; other placeholder photography via Unsplash.</p>
        </div>
      </div>
    </footer>
  );
}
