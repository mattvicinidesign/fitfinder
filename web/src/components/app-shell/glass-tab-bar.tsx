"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { BOTTOM_TAB_NAV } from "@/lib/navigation";
import { NavTab } from "@/components/app-shell/nav-tab";
import { safeBottomTabBar } from "@/lib/safe-area";
import { cn } from "@/lib/utils";

const LENS_WIDTH = 72;
const LENS_HEIGHT = 88;
const MAGNIFY_RADIUS = 52;
const MAX_SCALE = 1.38;

function scaleForDistance(distance: number): number {
  const t = Math.max(0, 1 - distance / MAGNIFY_RADIUS);
  return 1 + t * (MAX_SCALE - 1);
}

export function GlassTabBar() {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const draggingRef = useRef(false);
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

  const snapToNearestTab = useCallback(
    (x: number) => {
      if (!tabCenters.length) return x;
      let nearest = tabCenters[0];
      let nearestDistance = Number.POSITIVE_INFINITY;
      for (const center of tabCenters) {
        const distance = Math.abs(center - x);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = center;
        }
      }
      return nearest;
    },
    [tabCenters],
  );

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (reduceMotion) return;
    draggingRef.current = true;
    setIsDragging(true);
    containerRef.current?.setPointerCapture(event.pointerId);
    setLensX(lensXFromClient(event.clientX));
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || reduceMotion) return;
    setLensX(lensXFromClient(event.clientX));
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setIsDragging(false);
    containerRef.current?.releasePointerCapture(event.pointerId);
    setLensX(snapToNearestTab(lensXFromClient(event.clientX)));
  };

  const onPointerCancel = () => {
    draggingRef.current = false;
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
              transition: isDragging
                ? "none"
                : "left 280ms cubic-bezier(0.22, 1, 0.36, 1)",
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
              />
            );
          })}
        </div>
      </div>
    </nav>
  );
}
