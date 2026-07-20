"use client";

import { useEffect, useId, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AtsKeywordChangeDecision } from "@/lib/types";
import type { AtsKeywordChangeSnippet } from "@/lib/ats-keyword-change-snippets";
import { cn } from "@/lib/utils";

function SnippetColumn({
  label,
  text,
  highlight,
  variant,
}: {
  label: string;
  text: string;
  highlight: string;
  variant: "before" | "after";
}) {
  const parts = text.split(
    new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "i"),
  );

  return (
    <div className="min-w-0 flex-1 space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "rounded-lg p-2.5 text-[13px] leading-snug",
          variant === "before"
            ? "bg-rose-500/[0.06] text-foreground/85"
            : "bg-emerald-500/[0.06] text-foreground/90",
        )}
      >
        {parts.map((part, index) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <span
              key={`${part}-${index}`}
              className={cn(
                "font-semibold",
                variant === "before" ? "text-rose-400" : "text-emerald-400",
              )}
            >
              {part}
            </span>
          ) : (
            <span key={`${part}-${index}`}>{part}</span>
          ),
        )}
      </p>
    </div>
  );
}

export function AtsKeywordChangeAccordion({
  before,
  after,
  snippet,
  decision = "pending",
  reviewMode = false,
  onApprove,
  onReject,
  defaultOpen = true,
  collapseSignal = 0,
}: {
  before: string;
  after: string;
  snippet: AtsKeywordChangeSnippet;
  decision?: AtsKeywordChangeDecision;
  reviewMode?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  defaultOpen?: boolean;
  collapseSignal?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  useEffect(() => {
    if (collapseSignal > 0) {
      setOpen(false);
    }
  }, [collapseSignal]);

  const isExpanded = open;

  return (
    <li
      className={cn(
        "overflow-hidden rounded-xl border transition-[border-color,background-color,box-shadow,opacity] duration-200",
        isExpanded &&
          decision === "approved" &&
          "border-emerald-500/50 bg-emerald-500/[0.05] ring-1 ring-emerald-500/20",
        isExpanded &&
          decision === "rejected" &&
          "border-border/70 bg-muted/20 opacity-90 ring-1 ring-border/40",
        isExpanded &&
          decision === "pending" &&
          "border-primary/45 bg-primary/[0.05] ring-1 ring-primary/20",
        !isExpanded && decision === "approved" && "border-emerald-500/35 bg-card",
        !isExpanded && decision === "rejected" && "border-border/60 bg-card opacity-70",
        !isExpanded && decision === "pending" && "border-border/60 bg-card",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2.5 transition-colors",
          isExpanded && "bg-primary/[0.03]",
          isExpanded && decision === "approved" && "bg-emerald-500/[0.04]",
        )}
      >
        <button
          type="button"
          className="min-w-0 flex-1 text-left text-[14px] leading-snug"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
        >
          <span className={cn(decision === "rejected" && "line-through opacity-80")}>
            <span className="text-muted-foreground">{before}</span>
            <span className="mx-1.5 text-muted-foreground">→</span>
            <span className="font-medium text-foreground">{after}</span>
          </span>
        </button>

        {!reviewMode && decision !== "pending" ? (
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
              decision === "approved"
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-muted text-muted-foreground",
            )}
          >
            {decision === "approved" ? "Applied" : "Skipped"}
          </span>
        ) : null}

        <button
          type="button"
          className={cn(
            "shrink-0 rounded-md p-1 transition-colors",
            isExpanded
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
            isExpanded &&
              decision === "approved" &&
              "bg-emerald-500/15 text-emerald-400",
          )}
          aria-label={open ? "Collapse details" : "Expand details"}
          onClick={() => setOpen((value) => !value)}
        >
          <ChevronDown
            className={cn(
              "size-4 transition-transform duration-200",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </button>
      </div>

      {open ? (
        <div
          id={panelId}
          role="region"
          aria-label={`${before} to ${after} example`}
          className={cn(
            "border-t px-3 pb-3 pt-2",
            decision === "approved"
              ? "border-emerald-500/25 bg-emerald-500/[0.03]"
              : decision === "rejected"
                ? "border-border/60 bg-muted/10"
                : "border-primary/20 bg-primary/[0.03]",
          )}
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <SnippetColumn
              label="Original bullet"
              text={snippet.beforeSnippet}
              highlight={before}
              variant="before"
            />
            <SnippetColumn
              label="Optimized bullet"
              text={snippet.afterSnippet}
              highlight={after}
              variant="after"
            />
          </div>
          {reviewMode ? (
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                variant="outline"
                aria-label={`Approve ${before} to ${after}`}
                aria-pressed={decision === "approved"}
                onClick={() => {
                  onApprove?.();
                  setOpen(false);
                }}
                className={cn(
                  "flex-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300",
                  decision === "approved" &&
                    "border-emerald-500/50 bg-emerald-500/15 text-emerald-300",
                )}
              >
                <Check className="size-4" strokeWidth={2.5} />
                Approve
              </Button>
              <Button
                type="button"
                variant="outline"
                aria-label={`Reject ${before} to ${after}`}
                aria-pressed={decision === "rejected"}
                onClick={() => {
                  onReject?.();
                  setOpen(false);
                }}
                className={cn(
                  "flex-1 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300",
                  decision === "rejected" &&
                    "border-rose-500/50 bg-rose-500/15 text-rose-300",
                )}
              >
                <X className="size-4" strokeWidth={2.5} />
                Reject
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
