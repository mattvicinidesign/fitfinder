"use client";

import { useId, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
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
            ? "bg-muted/40 text-foreground/85"
            : "bg-primary/[0.06] text-foreground/90",
        )}
      >
        {parts.map((part, index) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <span key={`${part}-${index}`} className="font-semibold text-foreground">
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
  defaultOpen = false,
}: {
  before: string;
  after: string;
  snippet: AtsKeywordChangeSnippet;
  decision?: AtsKeywordChangeDecision;
  reviewMode?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <li
      className={cn(
        "overflow-hidden rounded-lg border bg-card",
        decision === "approved" && "border-emerald-500/40",
        decision === "rejected" && "border-border/60 opacity-70",
        decision === "pending" && "border-border/60",
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
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

        {reviewMode ? (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label={`Approve ${before} to ${after}`}
              aria-pressed={decision === "approved"}
              onClick={(event) => {
                event.stopPropagation();
                onApprove?.();
              }}
              className={cn(
                "rounded-md p-1.5 transition-colors",
                decision === "approved"
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
            >
              <Check className="size-4" strokeWidth={2.5} />
            </button>
            <button
              type="button"
              aria-label={`Reject ${before} to ${after}`}
              aria-pressed={decision === "rejected"}
              onClick={(event) => {
                event.stopPropagation();
                onReject?.();
              }}
              className={cn(
                "rounded-md p-1.5 transition-colors",
                decision === "rejected"
                  ? "bg-rose-500/15 text-rose-400"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
            >
              <X className="size-4" strokeWidth={2.5} />
            </button>
          </div>
        ) : decision !== "pending" ? (
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
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted/40"
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
          className="border-t border-border/60 px-3 pb-3 pt-2"
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <SnippetColumn
              label="Before"
              text={snippet.beforeSnippet}
              highlight={before}
              variant="before"
            />
            <SnippetColumn
              label="After"
              text={snippet.afterSnippet}
              highlight={after}
              variant="after"
            />
          </div>
        </div>
      ) : null}
    </li>
  );
}
