import { isNativePlatform } from "@/lib/platform";

type AppRouter = {
  push: (href: string) => void;
  replace?: (href: string) => void;
  refresh?: () => void;
};

/** Map App Router paths to Next static-export HTML files for Capacitor. */
export function resolveNativeStaticPath(path: string): string {
  const hashIndex = path.indexOf("#");
  const queryIndex = path.indexOf("?");
  const endIndex =
    hashIndex === -1
      ? queryIndex === -1
        ? path.length
        : queryIndex
      : queryIndex === -1
        ? hashIndex
        : Math.min(hashIndex, queryIndex);

  const pathname = path.slice(0, endIndex) || "/";
  const suffix = path.slice(endIndex);

  if (pathname === "/" || pathname === "") {
    return `/index.html${suffix}`;
  }

  if (pathname.endsWith(".html")) {
    return `${pathname}${suffix}`;
  }

  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) {
    return `/index.html${suffix}`;
  }

  if (parts.length === 1) {
    return `/${parts[0]}.html${suffix}`;
  }

  const file = parts[parts.length - 1]!;
  const dir = parts.slice(0, -1).join("/");
  return `/${dir}/${file}.html${suffix}`;
}

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
    const nativeTarget = resolveNativeStaticPath(target);
    if (mode === "replace") {
      window.location.replace(nativeTarget);
    } else {
      window.location.assign(nativeTarget);
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

export function goBackToResumeReview(router?: AppRouter): void {
  navigateApp("/resume-review", router, "replace");
}
