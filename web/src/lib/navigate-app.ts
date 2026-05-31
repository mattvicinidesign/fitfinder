import { isNativePlatform } from "@/lib/platform";

type AppRouter = {
  push: (href: string) => void;
  replace?: (href: string) => void;
  refresh?: () => void;
};

/**
 * Capacitor serves a static export — full document loads are more reliable
 * than Next.js client transitions inside the iOS WebView.
 */
export function navigateApp(
  path: string,
  router?: AppRouter,
  mode: "push" | "replace" = "push",
) {
  const target = path.startsWith("/") ? path : `/${path}`;

  if (isNativePlatform()) {
    if (mode === "replace") {
      window.location.replace(target);
    } else {
      window.location.assign(target);
    }
    return;
  }

  if (mode === "replace") {
    router?.replace?.(target);
  } else {
    router?.push(target);
  }
  router?.refresh?.();
}
