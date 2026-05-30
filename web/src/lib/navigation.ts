import {
  Bookmark,
  Columns2,
  Clock,
  ScanSearch,
  User,
  type LucideIcon,
} from "lucide-react";

/** Single source of truth for app navigation (sidebar + bottom tabs). */
export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const APP_NAV: NavItem[] = [
  { href: "/analyze", label: "Analyze", icon: ScanSearch },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/history", label: "History", icon: Clock },
  { href: "/compare", label: "Compare", icon: Columns2 },
  { href: "/profile", label: "Profile", icon: User },
];

export const PROTECTED_PREFIXES = APP_NAV.map((n) => n.href);

/** Canonical UI reference route (demo data, no auth required). */
export const FIT_FINDER_PREVIEW_PATH = "/preview";
