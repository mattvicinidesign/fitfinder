import {
  Bookmark,
  Clock,
  Home,
  ScanSearch,
  User,
  type LucideIcon,
} from "lucide-react";

/** Single source of truth for app navigation (bottom tabs). */
export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const APP_NAV: NavItem[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/analyze", label: "Analyze", icon: ScanSearch },
  { href: "/history", label: "History", icon: Clock },
  { href: "/profile", label: "Profile", icon: User },
];

export const PROTECTED_PREFIXES = APP_NAV.map((n) => n.href);

/** Canonical UI reference route (demo data, no auth required). */
export const FIT_FINDER_PREVIEW_PATH = "/preview";
