import { ArrowLeftRight, Home, ReceiptText, TrendingUp, UserRound, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/payments", label: "Payments", icon: ArrowLeftRight },
  { href: "/invest", label: "Invest", icon: TrendingUp },
  { href: "/activity", label: "Activity", icon: ReceiptText },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
