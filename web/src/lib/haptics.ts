import { isNativePlatform } from "@/lib/platform";

/** Light tap feedback for tab bar presses — native only, no-op on web. */
export function triggerNavHaptic(): void {
  if (!isNativePlatform()) return;

  void import("@capacitor/haptics")
    .then(({ Haptics, ImpactStyle }) =>
      Haptics.impact({ style: ImpactStyle.Light }),
    )
    .catch(() => {
      // Plugin unavailable outside the native shell.
    });
}
