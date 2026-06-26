import { cn } from "@/lib/utils";
import { ANALYZE_FIELD_CLASS } from "@/components/analyze-form-styles";

export const RESUME_UPLOAD_ACCEPT =
  ".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";

/** iOS WKWebView is more reliable with extension-only accept strings. */
export const RESUME_UPLOAD_ACCEPT_NATIVE = ".pdf,.doc,.docx,.txt";

export const RESUME_UPLOAD_TITLE = "Upload your resume";

export const RESUME_UPLOAD_HINT = "PDF, Word, or TXT";

export const RESUME_UPLOAD_CTA_CLASS =
  "rounded-xl bg-primary px-5 py-2.5 text-[15px] font-semibold text-primary-foreground";

/** Canonical resume dropzone — matches Analyze screen field styling. */
export function resumeUploadZoneClassName(className?: string) {
  return cn(
    ANALYZE_FIELD_CLASS,
    "flex w-full cursor-pointer flex-col items-center justify-center gap-2 py-8 text-center transition-colors hover:bg-muted/55 disabled:cursor-not-allowed disabled:opacity-60",
    className,
  );
}
