import { BarChart3, CalendarRange, LayoutDashboard, LineChart, UserRound, Wallet } from "lucide-react";

import type { NavItem } from "@/lib/navigation/guest";

export const HOST_NAV: NavItem[] = [
  { href: "/host", label: "Overview", icon: LayoutDashboard },
  { href: "/host/events", label: "My Events", icon: CalendarRange },
  { href: "/host/reservations", label: "Reservations", icon: BarChart3 },
  { href: "/host/finances", label: "Finances", icon: Wallet },
  { href: "/host/trends", label: "Culinary Trends", icon: LineChart },
  { href: "/host/profile", label: "Profile", icon: UserRound },
];

export function isHostActive(pathname: string, href: string) {
  return href === "/host" ? pathname === "/host" : pathname === href || pathname.startsWith(`${href}/`);
}
