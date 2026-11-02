import { CalendarDays, Compass, Heart, Ticket, UserRound, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/** Primary guest navigation. Used by the desktop header, mobile menu and mobile tab bar. */
export const GUEST_NAV: NavItem[] = [
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/bookings", label: "My Bookings", icon: Ticket },
  { href: "/saved", label: "Saved", icon: Heart },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
