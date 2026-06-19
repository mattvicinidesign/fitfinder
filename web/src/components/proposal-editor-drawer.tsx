"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Download, Loader2, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getAppOverlayRoot } from "@/lib/overlay-portal";
import { APP_PORTAL_OVERLAY_Z } from "@/lib/overlay-z-index";
import { downloadProposalPdf } from "@/lib/proposal-pdf";
import { safeBottomOverlay } from "@/lib/safe-area";
import type { ProposalGeneration } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProposalEditorDrawer({
  open,
  onClose,
  proposal,
  proposalText,
  onProposalTextChange,
  onRegenerate,
  regenerating,
  candidateName,
  jobTitle,
  companyName,
  portfolioUrl,
}: {
  open: boolean;
  onClose: () => void;
  proposal: ProposalGeneration;
  proposalText: string;
  onProposalTextChange: (value: string) => void;
  onRegenerate: () => void;
  regenerating: boolean;
  candidateName: string | null;
  jobTitle: string | null;
  companyName: string | null;
  portfolioUrl: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClose = useCallback(() => {
    if (regenerating) return;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    onClose();
  }, [onClose, regenerating]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !regenerating) handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleClose, regenerating]);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(t);
  }, [copied]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(proposalText);
      setCopied(true);
      toast.success("Proposal copied to clipboard.");
    } catch {
      toast.error("Couldn't copy. Select the text and copy manually.");
    }
  }

  function handleDownload() {
    try {
      downloadProposalPdf({
        candidateName,
        portfolioUrl: portfolioUrl ?? proposal.sections?.portfolioUrl ?? null,
        jobTitle,
        companyName,
        proposalText,
      });
    } catch {
      toast.error("Couldn't generate the PDF. Try again.");
    }
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className={cn(
        "absolute inset-0 flex min-h-0 flex-col justify-end overflow-hidden overscroll-none touch-pan-y",
        APP_PORTAL_OVERLAY_Z,
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="proposal-editor-title"
    >
      <button
        type="button"
        aria-label="Close proposal editor"
        className="absolute inset-0 bg-black/60"
        onClick={handleClose}
      />
      <div
        className={cn(
          "relative box-border flex w-full min-w-0 max-w-full flex-col overflow-hidden",
          "max-h-[92dvh] rounded-t-2xl border border-border/60 bg-card shadow-xl",
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border/60 px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2
              id="proposal-editor-title"
              className="text-[17px] font-semibold leading-snug"
            >
              Tailored Proposal
            </h2>
            <p className="truncate text-[13px] text-muted-foreground">
              {[jobTitle, companyName].filter(Boolean).join(" • ") ||
                "Edit before you send"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="-mr-1 inline-flex shrink-0 items-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-3 touch-pan-y">
          <Textarea
            id="proposal-text"
            value={proposalText}
            onChange={(e) => onProposalTextChange(e.target.value)}
            disabled={regenerating}
            className={cn(
              "box-border block min-h-[calc(92dvh-11rem)] w-full max-w-full min-w-0 flex-none",
              "[field-sizing:fixed] resize-none overflow-x-hidden",
              "break-words [overflow-wrap:anywhere] whitespace-pre-wrap",
              "border-0 bg-transparent px-3 py-1 text-[16px] leading-relaxed shadow-none",
              "focus-visible:border-0 focus-visible:ring-0",
              "sm:min-h-[420px] sm:text-[14px]",
            )}
            aria-label="Editable proposal text"
          />
        </div>

        <div
          className={cn(
            "grid shrink-0 grid-cols-3 gap-2 border-t border-border/60 bg-card px-3 py-3",
            safeBottomOverlay,
          )}
        >
          <Button
            type="button"
            variant="outline"
            className="h-11 min-w-0 gap-1.5 rounded-xl px-2 text-[13px] sm:gap-2 sm:px-3 sm:text-sm"
            onClick={() => void handleCopy()}
            disabled={regenerating}
          >
            {copied ? (
              <Check className="size-4 shrink-0" aria-hidden />
            ) : (
              <Copy className="size-4 shrink-0" aria-hidden />
            )}
            <span className="truncate">{copied ? "Copied" : "Copy"}</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 min-w-0 gap-1.5 rounded-xl px-2 text-[13px] sm:gap-2 sm:px-3 sm:text-sm"
            onClick={handleDownload}
            disabled={regenerating}
          >
            <Download className="size-4 shrink-0" aria-hidden />
            <span className="truncate">PDF</span>
          </Button>
          <Button
            type="button"
            className="h-11 min-w-0 gap-1.5 rounded-xl px-2 text-[13px] sm:gap-2 sm:px-3 sm:text-sm"
            onClick={onRegenerate}
            disabled={regenerating}
          >
            {regenerating ? (
              <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="size-4 shrink-0" aria-hidden />
            )}
            <span className="truncate">
              {regenerating ? "Regenerating" : "Regenerate"}
            </span>
          </Button>
        </div>
      </div>
    </div>,
    getAppOverlayRoot(),
  );
}
