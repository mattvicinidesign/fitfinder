"use client";

import { useRef, useState } from "react";
import { FileUp, CheckCircle2, Loader2 } from "lucide-react";
import { uploadResume } from "@/lib/resume-upload";
import { waitForResumeParse } from "@/lib/resume-parse-tracker";
import { ANALYZE_FIELD_CLASS } from "@/components/analyze-form-styles";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  onParsed: (payload: { resumeId: string; fileName: string }) => void;
  fileName?: string | null;
  disabled?: boolean;
  className?: string;
}

/**
 * Resume upload: PDF, Word, or text file. Upload returns quickly; AI parsing
 * continues in the background while the user fills in the job description.
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
    try {
      const { resumeId, fileName: name } = await uploadResume(file);
      onParsed({ resumeId, fileName: name });
      toast.success("Resume uploaded.");
      setUploading(false);
      setParsing(true);
      try {
        await waitForResumeParse(resumeId);
        toast.success("Resume parsed.");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Resume parsing failed.",
        );
      } finally {
        setParsing(false);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
      setUploading(false);
    } finally {
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
        accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => fileRef.current?.click()}
        className={cn(
          ANALYZE_FIELD_CLASS,
          "flex h-full w-full flex-col items-center justify-center gap-2 py-8 text-center hover:bg-muted/55 disabled:cursor-not-allowed disabled:opacity-60",
          className,
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
            {uploading ? (
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            ) : (
              <FileUp className="size-8 text-muted-foreground" />
            )}
            <span className="text-[17px] font-medium text-foreground">
              {uploading ? "Uploading…" : "Upload your resume"}
            </span>
            <span className="text-[13px] text-muted-foreground">
              PDF, Word (.doc, .docx), or .txt
            </span>
          </>
        )}
      </button>
    </>
  );
}
