"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { uploadResume } from "@/lib/resume-upload";
import { waitForResumeParse } from "@/lib/resume-parse-tracker";
import {
  RESUME_UPLOAD_ACCEPT,
  RESUME_UPLOAD_ACCEPT_NATIVE,
  RESUME_SCORE_ZONE_CTA_CLASS,
  RESUME_UPLOAD_CTA_CLASS,
  RESUME_UPLOAD_HINT,
  RESUME_UPLOAD_TITLE,
  RESUME_SCORE_TITLE,
  resumeUploadZoneClassName,
} from "@/components/resume-upload-styles";
import { Button, buttonVariants } from "@/components/ui/button";
import { CtaSpinner } from "@/components/ui/cta-spinner";
import { isNativePlatform } from "@/lib/platform";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  resumeId?: string | null;
  fileName?: string | null;
  onResumeChange: (payload: { resumeId: string; fileName: string }) => void;
  onScore: () => void;
  disabled?: boolean;
  className?: string;
  /** Compact card pinned to the bottom of the empty state. */
  pinnedBottom?: boolean;
}

export type ResumeReviewUploadZoneHandle = {
  openFilePicker: () => void;
};

export const ResumeReviewUploadZone = forwardRef<
  ResumeReviewUploadZoneHandle,
  Props
>(function ResumeReviewUploadZone(
  {
    resumeId,
    fileName,
    onResumeChange,
    onScore,
    disabled,
    className,
    pinnedBottom = false,
  },
  ref,
) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"uploading" | "parsing" | null>(null);
  const ingestLockRef = useRef(false);

  const hasResume = Boolean(resumeId && fileName);

  async function processFile(file: File) {
    if (ingestLockRef.current) return;
    ingestLockRef.current = true;
    setBusy(true);
    setPhase("uploading");
    try {
      const uploaded = await uploadResume(file);
      setPhase("parsing");
      await waitForResumeParse(uploaded.resumeId);
      onResumeChange({ resumeId: uploaded.resumeId, fileName: uploaded.fileName });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      ingestLockRef.current = false;
      setBusy(false);
      setPhase(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file || busy || disabled) return;
    void processFile(file);
  }

  function openFilePicker() {
    if (busy || disabled) return;
    fileRef.current?.click();
  }

  useImperativeHandle(ref, () => ({ openFilePicker }), [busy, disabled]);

  const busyLabel =
    phase === "uploading"
      ? "Uploading resume"
      : phase === "parsing"
        ? "Parsing resume"
        : null;

  const accept = isNativePlatform()
    ? RESUME_UPLOAD_ACCEPT_NATIVE
    : RESUME_UPLOAD_ACCEPT;

  return (
    <div className={cn("px-4", className)}>
      <div
        className={resumeUploadZoneClassName(
          cn(
            "relative",
            pinnedBottom ? "py-6" : "min-h-[220px]",
            dragOver && "border-primary/50 bg-muted/55",
          ),
        )}
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy && !disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept={accept}
          disabled={busy || disabled}
          aria-label={hasResume ? "Replace resume for review" : "Upload resume for review"}
          onChange={(e) => handleFiles(e.target.files)}
          onInput={(e) => handleFiles(e.currentTarget.files)}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center gap-3 text-center">
          {hasResume ? (
            <>
              {busy ? (
                <CtaSpinner className="size-8" />
              ) : (
                <CheckCircle2 className="size-8 text-primary" aria-hidden />
              )}
              <p
                className="w-full max-w-full truncate px-2 text-[17px] font-medium text-foreground"
                title={fileName ?? undefined}
              >
                {fileName}
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={busy || disabled}
                onClick={openFilePicker}
                className={RESUME_UPLOAD_CTA_CLASS}
                aria-busy={busy}
                aria-label={busy ? busyLabel ?? undefined : undefined}
              >
                {busy ? <CtaSpinner className="size-8" /> : RESUME_UPLOAD_TITLE}
              </button>
              {!busy ? (
                <span className="text-[13px] text-muted-foreground">
                  {RESUME_UPLOAD_HINT}
                </span>
              ) : null}
            </>
          )}

          {hasResume && !busy ? (
            <Button
              type="button"
              disabled={disabled}
              onClick={onScore}
              className={cn(
                buttonVariants({ variant: "default", size: "lg" }),
                RESUME_SCORE_ZONE_CTA_CLASS,
                "mt-1",
              )}
            >
              {RESUME_SCORE_TITLE}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
});
