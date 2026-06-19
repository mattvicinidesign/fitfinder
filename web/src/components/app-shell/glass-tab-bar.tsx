"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { BOTTOM_TAB_NAV } from "@/lib/navigation";
import { NavTab } from "@/components/app-shell/nav-tab";
import { useProfileOverlay } from "@/components/app-shell/profile-overlay";
import { triggerNavHaptic } from "@/lib/haptics";
import { safeBottomTabBar } from "@/lib/safe-area";
import { cn } from "@/lib/utils";

const LENS_WIDTH = 72;
const LENS_HEIGHT = 88;
const MAGNIFY_RADIUS = 52;
const MAX_SCALE = 1.38;
const DRAG_THRESHOLD_PX = 8;
const LENS_TRANSITION = "left 320ms cubic-bezier(0.22, 1, 0.36, 1)";

function scaleForDistance(distance: number): number {
  const t = Math.max(0, 1 - distance / MAGNIFY_RADIUS);
  return 1 + t * (MAX_SCALE - 1);
}

export function GlassTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { openProfile } = useProfileOverlay();
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const draggingRef = useRef(false);
  const didDragRef = useRef(false);
  const pointerActiveRef = useRef(false);
  const capturedPointerIdRef = useRef<number | null>(null);
  const pointerStartRef = useRef({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [tabCenters, setTabCenters] = useState<number[]>([]);
  const [lensX, setLensX] = useState(0);
  const [lensReady, setLensReady] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const measureCenters = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const centers = tabRefs.current.map((element) => {
      if (!element) return 0;
      const rect = element.getBoundingClientRect();
      return rect.left + rect.width / 2 - containerRect.left;
    });

    setTabCenters(centers);
    setLensReady(
      centers.length === BOTTOM_TAB_NAV.length &&
        centers.some((value) => Number.isFinite(value) && value > 0),
    );
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useLayoutEffect(() => {
    measureCenters();
  }, [measureCenters, pathname]);

  useEffect(() => {
    window.addEventListener("resize", measureCenters);
    return () => window.removeEventListener("resize", measureCenters);
  }, [measureCenters]);

  useEffect(() => {
    const activeIndex = BOTTOM_TAB_NAV.findIndex((item) => {
      const prefix = `${item.href}/`;
      return pathname === item.href || pathname.startsWith(prefix);
    });
    if (activeIndex < 0 || tabCenters[activeIndex] == null) return;
    if (!draggingRef.current) {
      setLensX(tabCenters[activeIndex]);
    }
  }, [pathname, tabCenters]);

  const clampLensX = useCallback(
    (x: number) => {
      const container = containerRef.current;
      if (!container) return x;
      const half = LENS_WIDTH / 2;
      const max = container.clientWidth - half;
      return Math.min(Math.max(x, half), max);
    },
    [],
  );

  const lensXFromClient = useCallback(
    (clientX: number) => {
      const container = containerRef.current;
      if (!container) return lensX;
      const rect = container.getBoundingClientRect();
      return clampLensX(clientX - rect.left);
    },
    [clampLensX, lensX],
  );

  const nearestTabFromX = useCallback(
    (x: number) => {
      if (!tabCenters.length) return null;

      let nearestIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      for (let index = 0; index < tabCenters.length; index += 1) {
        const center = tabCenters[index];
        if (center == null) continue;
        const distance = Math.abs(center - x);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      }

      return { index: nearestIndex, center: tabCenters[nearestIndex]! };
    },
    [tabCenters],
  );

  const snapToNearestTab = useCallback(
    (x: number) => nearestTabFromX(x)?.center ?? x,
    [nearestTabFromX],
  );

  const navigateToTab = useCallback(
    (index: number) => {
      const item = BOTTOM_TAB_NAV[index];
      if (!item) return;

      const prefix = `${item.href}/`;
      const isActive = pathname === item.href || pathname.startsWith(prefix);
      const isProfileTab = item.href === "/profile";

      if (isProfileTab) {
        if (pathname !== "/profile") {
          triggerNavHaptic();
          openProfile(pathname);
        }
        return;
      }

      if (isActive) return;

      triggerNavHaptic();

      if (pathname === "/profile") {
        router.replace(item.href);
        return;
      }

      router.push(item.href);
    },
    [pathname, router, openProfile],
  );

  const animateToTab = useCallback(
    (index: number) => {
      const center = tabCenters[index];
      if (center == null) return;
      draggingRef.current = false;
      setIsDragging(false);
      setLensX(center);
    },
    [tabCenters],
  );

  const shouldSuppressClick = useCallback(() => didDragRef.current, []);

  const releaseCapturedPointer = useCallback(() => {
    if (capturedPointerIdRef.current == null) return;
    containerRef.current?.releasePointerCapture(capturedPointerIdRef.current);
    capturedPointerIdRef.current = null;
  }, []);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (reduceMotion) return;
    if (event.button !== 0) return;
    didDragRef.current = false;
    pointerActiveRef.current = true;
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (reduceMotion || !pointerActiveRef.current) return;

    if (!draggingRef.current) {
      const dx = event.clientX - pointerStartRef.current.x;
      const dy = event.clientY - pointerStartRef.current.y;
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      draggingRef.current = true;
      didDragRef.current = true;
      setIsDragging(true);
      capturedPointerIdRef.current = event.pointerId;
      containerRef.current?.setPointerCapture(event.pointerId);
    }

    setLensX(lensXFromClient(event.clientX));
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    pointerActiveRef.current = false;
    releaseCapturedPointer();
    if (draggingRef.current) {
      draggingRef.current = false;
      setIsDragging(false);
      const x = lensXFromClient(event.clientX);
      const nearest = nearestTabFromX(x);
      if (nearest) {
        setLensX(nearest.center);
        navigateToTab(nearest.index);
      } else {
        setLensX(snapToNearestTab(x));
      }
    }
    if (didDragRef.current) {
      window.setTimeout(() => {
        didDragRef.current = false;
      }, 0);
    }
  };

  const onPointerCancel = () => {
    pointerActiveRef.current = false;
    releaseCapturedPointer();
    draggingRef.current = false;
    didDragRef.current = false;
    setIsDragging(false);
    const activeIndex = BOTTOM_TAB_NAV.findIndex((item) => {
      const prefix = `${item.href}/`;
      return pathname === item.href || pathname.startsWith(prefix);
    });
    if (activeIndex >= 0 && tabCenters[activeIndex] != null) {
      setLensX(tabCenters[activeIndex]);
    }
  };

  return (
    <nav
      className={cn("shrink-0 z-40 px-4 pt-2", safeBottomTabBar)}
      aria-label="Main"
    >
      <div
        ref={containerRef}
        className={cn(
          "relative mx-auto touch-pan-x",
          "rounded-[999px] border border-white/12",
          "bg-background/35 shadow-[0_10px_40px_rgba(0,0,0,0.45)]",
          "backdrop-blur-2xl backdrop-saturate-150",
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        {!reduceMotion ? (
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute top-1/2 z-0 -translate-y-1/2 rounded-[999px]",
              "border border-white/20 bg-white/[0.08] backdrop-blur-md",
              "shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_0_28px_rgba(96,165,250,0.22)]",
              "before:pointer-events-none before:absolute before:inset-0 before:rounded-[999px]",
              "before:bg-gradient-to-b before:from-cyan-300/25 before:via-transparent before:to-fuchsia-300/20",
              !lensReady && "opacity-0",
            )}
            style={{
              width: LENS_WIDTH,
              height: LENS_HEIGHT,
              left: lensX - LENS_WIDTH / 2,
              transition: isDragging ? "none" : LENS_TRANSITION,
            }}
          />
        ) : null}

        <div className="relative z-10 flex h-[58px] items-stretch">
          {BOTTOM_TAB_NAV.map((item, index) => {
            const center = tabCenters[index] ?? 0;
            const distance = lensReady ? Math.abs(center - lensX) : MAGNIFY_RADIUS;
            const magnifyScale = reduceMotion
              ? 1
              : scaleForDistance(distance);
            const lensHighlight = !reduceMotion && magnifyScale > 1.12;

            return (
              <NavTab
                key={item.href}
                ref={(element) => {
                  tabRefs.current[index] = element;
                }}
                item={item}
                magnifyScale={magnifyScale}
                lensHighlight={lensHighlight}
                onSelect={() => animateToTab(index)}
                shouldSuppressClick={shouldSuppressClick}
              />
            );
          })}
        </div>
      </div>
    </nav>
  );
}
