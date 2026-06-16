import { isNativePlatform } from "@/lib/platform";

/** Open an external https URL — in-app browser on native, new tab on web. */
export async function openExternalUrl(url: string): Promise<void> {
  if (typeof window === "undefined") return;

  if (isNativePlatform()) {
    try {
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url });
      return;
    } catch {
      window.location.assign(url);
      return;
    }
  }

  window.open(url, "_blank", "noopener,noreferrer");
}
