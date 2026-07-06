import { cn } from "@/lib/utils";
import { ANALYZE_FIELD_CLASS } from "@/components/analyze-form-styles";

export const RESUME_UPLOAD_ACCEPT =
  ".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";

/** iOS WKWebView is more reliable with extension-only accept strings. */
export const RESUME_UPLOAD_ACCEPT_NATIVE = ".pdf,.doc,.docx,.txt";

export const RESUME_UPLOAD_TITLE = "Upload your resume";

export const RESUME_SCORE_TITLE = "+ Score My Resume";

export const RESUME_UPLOAD_HINT = "PDF, Word, or TXT";

export const RESUME_UPLOAD_CTA_CLASS =
  "rounded-xl bg-primary px-5 py-2.5 text-[15px] font-semibold text-primary-foreground";

/** Header action on Analyze / Score when a resume is already loaded. */
export const REPLACE_RESUME_BUTTON_CLASS =
  "rounded-lg border border-border/80 bg-card px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/40";

/** In-zone Score CTA — contained width (not full-bleed sticky bar). */
export const RESUME_SCORE_ZONE_CTA_CLASS =
  "inline-flex h-11 max-w-full min-w-0 items-center justify-center rounded-xl px-4 text-[15px] font-semibold shadow-[0_8px_28px_rgba(0,0,0,0.45)]";

/** Primary floating CTA — matches Home “+ New Fit Analysis” and Score actions. */
export const PRIMARY_FLOATING_CTA_CLASS =
  "h-12 w-full rounded-xl text-[17px] font-semibold shadow-[0_8px_28px_rgba(0,0,0,0.45)] disabled:pointer-events-none disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 disabled:shadow-none";

/** Full-width primary actions on Score screens (matches onboarding / analyze CTAs). */
export const RESUME_REVIEW_PRIMARY_CTA_CLASS = PRIMARY_FLOATING_CTA_CLASS;

/** Canonical resume dropzone — matches Analyze screen field styling. */
export function resumeUploadZoneClassName(className?: string) {
  return cn(
    ANALYZE_FIELD_CLASS,
    "flex w-full cursor-pointer flex-col items-center justify-center gap-2 py-8 text-center transition-colors hover:bg-muted/55 disabled:cursor-not-allowed disabled:opacity-60",
    className,
  );
}
