"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { uploadResume } from "@/lib/resume-upload";
import { waitForResumeParse } from "@/lib/resume-parse-tracker";
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
        ? "Reading resume…"
        : null;

  return (
    <div className={cn("px-4", className)}>
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload resume for review"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!busy && !disabled) fileRef.current?.click();
          }
        }}
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
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 text-center transition-colors",
          pinnedBottom ? "py-6" : "min-h-[220px] py-10",
          dragOver
            ? "border-primary/60 bg-primary/10"
            : "border-border/80 bg-card/40 hover:border-primary/40 hover:bg-card/70",
          (busy || disabled) && "pointer-events-none opacity-60",
        )}
      >
        {busy ? (
          <Loader2 className="size-10 animate-spin text-primary" aria-hidden />
        ) : (
          <FileUp className="size-10 text-muted-foreground" strokeWidth={1.5} aria-hidden />
        )}
        <span className="rounded-xl bg-primary px-5 py-2.5 text-[15px] font-semibold text-primary-foreground">
          {busy ? statusLabel : "Upload Resume"}
        </span>
        {!busy ? (
          <p className="text-[13px] text-muted-foreground">PDF or DOCX</p>
        ) : null}
      </div>
    </div>
  );
}
