"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
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
  onParsed: (payload: { resumeId: string; fileName: string }) => void;
  fileName?: string | null;
  disabled?: boolean;
  className?: string;
}

/**
 * Resume upload: PDF, Word, or text file. Shows success only after storage
 * upload and AI parsing both finish.
 */
export function ResumeFilePicker({
  onParsed,
  fileName,
  disabled,
  className,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    setParsing(false);
    try {
      const { resumeId, fileName: name } = await uploadResume(file);
      onParsed({ resumeId, fileName: name });
      setUploading(false);
      setParsing(true);
      await waitForResumeParse(resumeId);
      toast.success("Upload complete.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
      setParsing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const busy = uploading || parsing;
  const statusLabel = uploading
    ? "Uploading…"
    : parsing
      ? "Parsing resume…"
      : fileName
        ? "Tap to replace"
        : null;

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept={RESUME_UPLOAD_ACCEPT}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => fileRef.current?.click()}
        className={resumeUploadZoneClassName(
          cn("h-full", className),
        )}
      >
        {fileName ? (
          <>
            {parsing ? (
              <Loader2 className="size-8 animate-spin text-primary" />
            ) : (
              <CheckCircle2 className="size-8 text-primary" />
            )}
            <span className="text-[17px] font-medium text-foreground break-all">
              {fileName}
            </span>
            {statusLabel ? (
              <span className="text-[13px] text-muted-foreground">
                {statusLabel}
              </span>
            ) : null}
          </>
        ) : (
          <>
            <span className={RESUME_UPLOAD_CTA_CLASS}>
              {uploading ? "Uploading…" : RESUME_UPLOAD_TITLE}
            </span>
            {!uploading ? (
              <span className="text-[13px] text-muted-foreground">
                {RESUME_UPLOAD_HINT}
              </span>
            ) : null}
          </>
        )}
      </button>
    </>
  );
}
