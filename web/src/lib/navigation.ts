import {
  BarChart2,
  ClipboardCheck,
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

export const ANALYZE_ROUTE = "/analyze";
export const RESUME_REVIEW_ROUTE = "/resume-review";

export const APP_NAV: NavItem[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: RESUME_REVIEW_ROUTE, label: "Score", icon: ClipboardCheck },
  { href: ANALYZE_ROUTE, label: "Analyze", icon: ScanSearch },
  { href: "/stats", label: "Stats", icon: BarChart2 },
  { href: "/profile", label: "Profile", icon: User },
];

/** Bottom tab bar — Analyze is a home-screen CTA, not a tab. */
export const BOTTOM_TAB_NAV: NavItem[] = APP_NAV.filter(
  (item) => item.href !== ANALYZE_ROUTE,
);

export const PROTECTED_PREFIXES = [
  ...APP_NAV.map((n) => n.href),
  "/saved",
];

/** Canonical UI reference route (demo data, no auth required). */
export const FIT_FINDER_PREVIEW_PATH = "/preview";
