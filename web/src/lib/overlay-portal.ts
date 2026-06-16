/** Portal mount inside AppFrame — keeps overlays in the phone column (web + native). */
export const APP_OVERLAY_ROOT_ID = "app-overlay-root";

export function getAppOverlayRoot(): HTMLElement {
  if (typeof document === "undefined") {
    throw new Error("Document is not available.");
  }
  return (
    document.getElementById(APP_OVERLAY_ROOT_ID) ??
    document.body
  );
}
