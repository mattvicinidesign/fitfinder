import { isNativePlatform } from "@/lib/platform";

/** Deep link scheme registered in iOS Info.plist (CFBundleURLSchemes). */
export const NATIVE_AUTH_CALLBACK_SCHEME = "fitfinder://auth-callback";

/**
 * Redirect target for magic-link / OTP emails.
 * Native uses a custom URL scheme so iOS opens the app instead of Safari → localhost.
 */
export function getAuthCallbackRedirectUrl(nextPath: string): string {
  const next = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;

  if (typeof window !== "undefined" && isNativePlatform()) {
    return `${NATIVE_AUTH_CALLBACK_SCHEME}?next=${encodeURIComponent(next)}`;
  }

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000";
  return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
}

/** Map fitfinder://auth-callback?…#… into an in-app /auth/callback route. */
export function nativeAuthCallbackPath(url: string): string | null {
  if (!url.includes("auth-callback")) return null;

  const normalized = url.replace(/^fitfinder:\/\//i, "https://local/");
  try {
    const parsed = new URL(normalized);
    return `/auth/callback${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}
