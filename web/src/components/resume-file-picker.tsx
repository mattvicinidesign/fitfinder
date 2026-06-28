"use client";

import { useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { CtaSpinner } from "@/components/ui/cta-spinner";
import { uploadResume } from "@/lib/resume-upload";
import { waitForResumeParse } from "@/lib/resume-parse-tracker";
import {
  RESUME_UPLOAD_ACCEPT,
  RESUME_UPLOAD_ACCEPT_NATIVE,
  RESUME_UPLOAD_CTA_CLASS,
  RESUME_UPLOAD_HINT,
  RESUME_UPLOAD_TITLE,
  resumeUploadZoneClassName,
} from "@/components/resume-upload-styles";
import { isNativePlatform } from "@/lib/platform";
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
 *
 * iOS WKWebView ignores display:none file inputs — the picker opens but
 * onChange never fires. Use an opacity-0 overlay input instead.
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
  const ingestLockRef = useRef(false);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file || ingestLockRef.current) return;

    ingestLockRef.current = true;
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
      ingestLockRef.current = false;
      setUploading(false);
      setParsing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const busy = uploading || parsing;
  const busyLabel = uploading
    ? "Uploading resume"
    : parsing
      ? "Parsing resume"
      : null;

  const accept = isNativePlatform()
    ? RESUME_UPLOAD_ACCEPT_NATIVE
    : RESUME_UPLOAD_ACCEPT;

  return (
    <label
      className={resumeUploadZoneClassName(
        cn("relative block h-full", className),
      )}
    >
      <input
        ref={fileRef}
        type="file"
        accept={accept}
        disabled={disabled || busy}
        aria-label={RESUME_UPLOAD_TITLE}
        onChange={(e) => void handleFiles(e.target.files)}
        onInput={(e) => void handleFiles(e.currentTarget.files)}
        className={cn(
          "absolute inset-0 z-10 h-full w-full cursor-pointer opacity-[0.0001]",
          (disabled || busy) && "pointer-events-none",
        )}
      />
      <div className="pointer-events-none flex flex-col items-center justify-center gap-2 py-8 text-center">
        {fileName ? (
          <>
            {parsing ? (
              <CtaSpinner className="size-8" />
            ) : (
              <CheckCircle2 className="size-8 text-primary" />
            )}
            <span className="text-[17px] font-medium text-foreground break-all">
              {fileName}
            </span>
            {!parsing && !uploading ? (
              <span className="text-[13px] text-muted-foreground">
                Tap to replace
              </span>
            ) : null}
          </>
        ) : (
          <>
            <span
              className={RESUME_UPLOAD_CTA_CLASS}
              aria-busy={uploading}
              aria-label={uploading ? busyLabel ?? undefined : undefined}
            >
              {uploading ? <CtaSpinner className="size-8" /> : RESUME_UPLOAD_TITLE}
            </span>
            {!uploading ? (
              <span className="text-[13px] text-muted-foreground">
                {RESUME_UPLOAD_HINT}
              </span>
            ) : null}
          </>
        )}
      </div>
    </label>
  );
}
