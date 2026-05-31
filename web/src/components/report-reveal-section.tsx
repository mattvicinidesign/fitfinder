"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  type ReactNode,
} from "react";
import { useRevealOnMount } from "@/lib/use-score-reveal";
import { cn } from "@/lib/utils";

export const REPORT_REVEAL_STAGGER_MS = 120;

const ReportRevealIndexContext = createContext<(() => number) | null>(null);

export function ReportRevealProvider({ children }: { children: ReactNode }) {
  const indexRef = useRef(0);
  const nextIndex = useCallback(() => indexRef.current++, []);

  return (
    <ReportRevealIndexContext.Provider value={nextIndex}>
      {children}
    </ReportRevealIndexContext.Provider>
  );
}

/** Slide a report block up into view; stagger order follows render order under ReportRevealProvider. */
export function ReportRevealSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const nextIndex = useContext(ReportRevealIndexContext);
  const assignedIndex = useRef<number | null>(null);
  if (assignedIndex.current === null && nextIndex) {
    assignedIndex.current = nextIndex();
  }
  const index = assignedIndex.current ?? 0;
  const revealed = useRevealOnMount(index * REPORT_REVEAL_STAGGER_MS);

  return (
    <div
      className={cn(
        "transition-[opacity,transform] duration-500 ease-out will-change-[opacity,transform]",
        revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
        className,
      )}
    >
      {children}
    </div>
  );
}
