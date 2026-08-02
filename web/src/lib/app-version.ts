import { App } from "@capacitor/app";
import { isNativePlatform } from "@/lib/platform";
import buildMeta from "../../build-meta.json";

/**
 * Format marketing version for the home badge (e.g. "v1.0"). Build number is never included.
 * Native: live value from Xcode via App.getInfo().
 * Web / fallback: build-meta.json mirrored from Xcode on capacitor:sync:before.
 */
function labelFromVersion(version: string | null | undefined): string | null {
  const trimmed = version?.trim();
  if (!trimmed) return null;
  return trimmed.startsWith("v") ? trimmed : `v${trimmed}`;
}

/** Returns a UI label like "v1.0", or null if unavailable. */
export async function getAppVersionLabel(): Promise<string | null> {
  if (isNativePlatform()) {
    try {
      const { version } = await App.getInfo();
      const native = labelFromVersion(version);
      if (native) return native;
    } catch {
      /* fall through to mirrored meta */
    }
  }

  return labelFromVersion(
    typeof buildMeta.version === "string" ? buildMeta.version : null,
  );
}
