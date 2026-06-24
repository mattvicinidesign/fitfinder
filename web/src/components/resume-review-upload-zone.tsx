"use client";

import { useRef, useState } from "react";
import { uploadResume } from "@/lib/resume-upload";
import { waitForResumeParse } from "@/lib/resume-parse-tracker";
import {
  RESUME_UPLOAD_ACCEPT,
  RESUME_UPLOAD_CTA_CLASS,
  RESUME_UPLOAD_HINT,
  RESUME_UPLOAD_TITLE,
  resumeUploadZoneClassName,
} from "@/components/resume-upload-styles";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  onReady: (payload: { resumeId: string; fileName: string }) => void;
  disabled?: boolean;
  className?: string;
  /** Compact card pinned to the bottom of the empty state. */
  pinnedBottom?: boolean;
}

export function ResumeReviewUploadZone({
  onReady,
  disabled,
  className,
  pinnedBottom = false,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"uploading" | "parsing" | null>(null);

  async function processFile(file: File) {
    setBusy(true);
    setPhase("uploading");
    try {
      const { resumeId, fileName } = await uploadResume(file);
      setPhase("parsing");
      await waitForResumeParse(resumeId);
      onReady({ resumeId, fileName });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
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

  const statusLabel =
    phase === "uploading"
      ? "Uploading…"
      : phase === "parsing"
        ? "Parsing resume…"
        : null;

  return (
    <div className={cn("px-4", className)}>
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept={RESUME_UPLOAD_ACCEPT}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        disabled={busy || disabled}
        aria-label="Upload resume for review"
        onClick={() => {
          if (!busy && !disabled) fileRef.current?.click();
        }}
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
        className={resumeUploadZoneClassName(
          cn(
            pinnedBottom ? "py-6" : "min-h-[220px]",
            dragOver && "border-primary/50 bg-muted/55",
          ),
        )}
      >
        <span className={RESUME_UPLOAD_CTA_CLASS}>
          {busy ? statusLabel : RESUME_UPLOAD_TITLE}
        </span>
        {!busy ? (
          <span className="text-[13px] text-muted-foreground">
            {RESUME_UPLOAD_HINT}
          </span>
        ) : null}
      </button>
    </div>
  );
}
