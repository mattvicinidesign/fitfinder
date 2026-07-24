import { DEFAULT_APP_ROUTE } from "@/lib/app-session";
import {
  APP_NAV,
  FIT_FINDER_PREVIEW_PATH,
  PROTECTED_PREFIXES,
} from "@/lib/navigation";

const DEFAULT_AUTH_NEXT = DEFAULT_APP_ROUTE;

/** Internal paths magic-link `next` may redirect to after sign-in. */
const ALLOWED_AUTH_NEXT_PATHS = new Set([
  ...APP_NAV.map((item) => item.href),
  ...PROTECTED_PREFIXES,
  FIT_FINDER_PREVIEW_PATH,
  "/auth/callback",
  "/home",
  "/analyze",
  "/saved",
  "/stats",
  "/profile",
  "/resume-review",
  "/compare",
  "/signup",
]);

/**
 * Allowlist safe internal relative paths only.
 * Rejects protocol-relative (`//evil.com`), absolute URLs, and encoded bypasses.
 */
export function sanitizeAuthNextPath(
  raw: string | null | undefined,
  fallback: string = DEFAULT_AUTH_NEXT,
): string {
  if (!raw?.trim()) return fallback;

  let decoded = raw.trim();
  try {
    // Decode once — double-encoding like %2F%2Fevil.com becomes //evil.com.
    decoded = decodeURIComponent(decoded);
  } catch {
    return fallback;
  }

  // Strip null bytes / whitespace tricks.
  decoded = decoded.replace(/[\0\r\n]/g, "").trim();

  if (
    !decoded.startsWith("/") ||
    decoded.startsWith("//") ||
    decoded.startsWith("/\\") ||
    /^\/[a-z]+:/i.test(decoded)
  ) {
    return fallback;
  }

  // Block scheme-like paths and backslash normalization bypasses.
  if (decoded.includes("://") || decoded.includes("\\")) {
    return fallback;
  }

  const pathname = decoded.split(/[?#]/)[0] ?? decoded;
  if (!pathname.startsWith("/") || pathname.startsWith("//")) {
    return fallback;
  }

  const allowed = [...ALLOWED_AUTH_NEXT_PATHS].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  return allowed ? pathname : fallback;
}
