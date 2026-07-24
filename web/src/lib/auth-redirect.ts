import { isNativePlatform } from "@/lib/platform";
import { sanitizeAuthNextPath } from "@/lib/safe-auth-redirect";

/** Deep link scheme registered in iOS Info.plist (CFBundleURLSchemes). */
export const NATIVE_AUTH_CALLBACK_SCHEME = "fitfinder://auth-callback";

function normalizeOrigin(url: string): string {
  return url.replace(/\/$/, "");
}

/**
 * Public app origin for auth redirects (set at build time on Vercel via VERCEL_URL).
 * Override with NEXT_PUBLIC_APP_URL in Vercel env if you use a custom domain.
 */
export function getConfiguredAppOrigin(): string | null {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!configured) return null;
  return normalizeOrigin(configured);
}

/** Best origin for magic-link emailRedirectTo on web. */
export function getWebAuthOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return getConfiguredAppOrigin() ?? "http://localhost:3000";
}

/**
 * Redirect target for magic-link / OTP emails.
 * Native uses a custom URL scheme so iOS opens the app instead of Safari → localhost.
 */
export function getAuthCallbackRedirectUrl(nextPath: string): string {
  const next = sanitizeAuthNextPath(nextPath);

  if (typeof window !== "undefined" && isNativePlatform()) {
    return `${NATIVE_AUTH_CALLBACK_SCHEME}?next=${encodeURIComponent(next)}`;
  }

  const origin = getWebAuthOrigin();
  return `${origin}/api/auth/callback?next=${encodeURIComponent(next)}`;
}

/** Map fitfinder://auth-callback?…#… into an in-app /auth/callback route. */
export function nativeAuthCallbackPath(url: string): string | null {
  if (!url.includes("auth-callback")) return null;

  const normalized = url.replace(/^fitfinder:\/\//i, "https://local/");
  try {
    const parsed = new URL(normalized);
    const next = sanitizeAuthNextPath(parsed.searchParams.get("next"));
    parsed.searchParams.set("next", next);
    return `/auth/callback${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}
