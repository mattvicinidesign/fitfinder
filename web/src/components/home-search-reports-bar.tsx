"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { Sparkles, X } from "lucide-react";
import {
  markSearchReportsTypewriterDone,
  shouldPlaySearchReportsTypewriter,
} from "@/lib/app-session";
import { cn } from "@/lib/utils";

const PLACEHOLDER_TEXT = "Search Reports";
const TYPEWRITER_CHAR_MS = 68;

function AiModeButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      aria-label="AI mode"
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-1",
        "text-[12px] font-semibold leading-none text-white/90 transition-colors",
        "hover:bg-white/15 active:scale-[0.98]",
        className,
      )}
    >
      <Sparkles className="size-3 shrink-0 text-emerald-300" aria-hidden />
      AI mode
    </button>
  );
}

export function HomeSearchReportsBar({
  className,
  value,
  onChange,
}: {
  className?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [active, setActive] = useState(false);
  const [displayText, setDisplayText] = useState("");
  const [showCursor, setShowCursor] = useState(false);

  const isSearching = active || value.length > 0;

  useEffect(() => {
    if (isSearching) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const shouldAnimate =
      !reduceMotion && shouldPlaySearchReportsTypewriter();

    if (!shouldAnimate) {
      setDisplayText(PLACEHOLDER_TEXT);
      setShowCursor(false);
      markSearchReportsTypewriterDone();
      return;
    }

    setDisplayText("");
    setShowCursor(true);

    let index = 0;
    const intervalId = window.setInterval(() => {
      index += 1;
      setDisplayText(PLACEHOLDER_TEXT.slice(0, index));
      if (index >= PLACEHOLDER_TEXT.length) {
        window.clearInterval(intervalId);
        setShowCursor(false);
        markSearchReportsTypewriterDone();
      }
    }, TYPEWRITER_CHAR_MS);

    return () => window.clearInterval(intervalId);
  }, [isSearching]);

  const activate = () => {
    markSearchReportsTypewriterDone();
    setActive(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const deactivate = () => {
    setActive(false);
    onChange("");
  };

  const handleBlur = () => {
    if (!value.trim()) setActive(false);
  };

  return (
    <div
      role={isSearching ? undefined : "button"}
      tabIndex={isSearching ? undefined : 0}
      aria-label={isSearching ? undefined : PLACEHOLDER_TEXT}
      onClick={!isSearching ? activate : undefined}
      onKeyDown={
        !isSearching
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                activate();
              }
            }
          : undefined
      }
      className={cn(
        "relative flex items-center gap-3 rounded-2xl px-4 py-4 shadow-lg ring-1 backdrop-blur-md transition-[background-color,box-shadow,ring-color]",
        isSearching
          ? "bg-[#0f1419]/78 ring-white/20"
          : "bg-[#0f1419]/45 ring-white/15",
        !isSearching && "cursor-text",
        className,
      )}
    >
      <Image
        src="/only-fit-wordmark.png"
        alt=""
        width={331}
        height={148}
        className="pointer-events-none h-6 w-auto shrink-0 object-contain"
        aria-hidden
      />
      {isSearching ? (
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={handleBlur}
          placeholder={PLACEHOLDER_TEXT}
          aria-label={PLACEHOLDER_TEXT}
          className="min-h-[1.25rem] flex-1 bg-transparent text-[16px] font-medium text-white outline-none placeholder:text-white/40 [&::-webkit-search-cancel-button]:hidden"
        />
      ) : (
        <span
          className="pointer-events-none flex min-h-[1.25rem] flex-1 items-center text-[16px] font-medium text-white/40"
          aria-hidden
        >
          {displayText}
          {showCursor ? (
            <span
              aria-hidden
              className="ml-px inline-block w-[2px] animate-pulse bg-white/50"
            >
              |
            </span>
          ) : null}
        </span>
      )}
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          className="-mr-1 flex size-8 shrink-0 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          onMouseDown={(event) => event.preventDefault()}
          onClick={deactivate}
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : (
        <AiModeButton />
      )}
    </div>
  );
}
