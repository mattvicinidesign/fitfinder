import { useEffect, type RefObject } from "react";

const AXIS_LOCK_THRESHOLD_PX = 8;

/**
 * Horizontal scroll region nested in a vertical page scroll.
 * After a small move, lock the gesture axis so vertical drags scroll the page
 * and horizontal drags scroll the carousel (iOS WKWebView + web preview).
 */
export function useHorizontalScrollAxisLock(
  ref: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let startX = 0;
    let startY = 0;
    let axis: "x" | "y" | null = null;

    const reset = () => {
      axis = null;
      node.style.removeProperty("overflow-x");
    };

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
      axis = null;
      node.style.removeProperty("overflow-x");
    };

    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;

      if (axis === null) {
        const dx = Math.abs(event.touches[0].clientX - startX);
        const dy = Math.abs(event.touches[0].clientY - startY);
        if (dx < AXIS_LOCK_THRESHOLD_PX && dy < AXIS_LOCK_THRESHOLD_PX) return;
        axis = dx > dy ? "x" : "y";
      }

      if (axis === "y") {
        node.style.overflowX = "hidden";
      }
    };

    node.addEventListener("touchstart", onTouchStart, { passive: true });
    node.addEventListener("touchmove", onTouchMove, { passive: true });
    node.addEventListener("touchend", reset, { passive: true });
    node.addEventListener("touchcancel", reset, { passive: true });

    return () => {
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchmove", onTouchMove);
      node.removeEventListener("touchend", reset);
      node.removeEventListener("touchcancel", reset);
      reset();
    };
  }, [ref]);
}
