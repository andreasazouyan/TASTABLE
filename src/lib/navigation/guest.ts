import { CalendarDays, Compass, Heart, House, Ticket, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/**
 * Primary guest navigation, in display order. Used by the desktop header, mobile menu and
 * mobile tab bar. Profile is not a tab: it lives in the avatar button at the top right.
 */
export const GUEST_NAV: NavItem[] = [
  { href: "/", label: "Home", icon: House },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/saved", label: "Saved", icon: Heart },
  { href: "/bookings", label: "My Bookings", icon: Ticket },
];

export function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
