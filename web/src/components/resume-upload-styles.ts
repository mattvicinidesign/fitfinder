import { cn } from "@/lib/utils";
import { ANALYZE_FIELD_CLASS } from "@/components/analyze-form-styles";

export const RESUME_UPLOAD_ACCEPT =
  ".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";

/** iOS WKWebView is more reliable with extension-only accept strings. */
export const RESUME_UPLOAD_ACCEPT_NATIVE = ".pdf,.doc,.docx,.txt";

export const RESUME_UPLOAD_TITLE = "Upload your resume";

export const RESUME_SCORE_TITLE = "+ Score My Resume";

export const RESUME_UPLOAD_HINT = "PDF, Word, or TXT";

export const RESUME_UPLOAD_REPLACE_HINT = "Tap to replace";

export const RESUME_UPLOAD_FILENAME_CLASS =
  "text-[17px] font-medium text-foreground";

export const RESUME_UPLOAD_SECONDARY_HINT_CLASS =
  "text-[13px] text-muted-foreground";

/** Compact primary chip inside the resume dropzone (not a full-width screen CTA). */
export const RESUME_UPLOAD_CTA_CLASS =
  "rounded-xl bg-primary px-5 py-2.5 text-[15px] font-semibold text-primary-foreground";

/** Header action on Analyze / Score when a resume is already loaded. */
export const REPLACE_RESUME_BUTTON_CLASS =
  "rounded-lg border border-border/80 bg-card px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/40";

/** In-zone Score CTA — contained width (not full-bleed sticky bar). */
export const RESUME_SCORE_ZONE_CTA_CLASS =
  "inline-flex h-11 max-w-full min-w-0 items-center justify-center rounded-xl px-4 text-[15px] font-semibold shadow-[0_8px_28px_rgba(0,0,0,0.45)]";

/**
 * CTA sizing tiers (use these for all full-width / sticky / drawer actions):
 * - Screen / floating: h-12, text-[17px]
 * - Regular (drawer, modal, in-card): h-11, text-[15px]
 */
export const SCREEN_PRIMARY_CTA_CLASS =
  "h-12 w-full rounded-xl text-[17px] font-semibold";

export const SCREEN_REGULAR_CTA_CLASS =
  "h-11 w-full rounded-xl text-[15px] font-semibold";

/** Shared disabled treatment for filled floating primaries. */
export const PRIMARY_CTA_DISABLED_CLASS =
  "disabled:pointer-events-none disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 disabled:shadow-none";

/** Blue outline fill — pairs with filled primary CTAs. */
export const SCREEN_PRIMARY_OUTLINE_CTA_CLASS =
  "border-primary bg-card text-primary hover:bg-muted hover:text-primary dark:bg-card dark:hover:bg-muted";

/** Primary floating CTA — Home, Analyze, onboarding, Score sticky bars. */
export const PRIMARY_FLOATING_CTA_CLASS = cn(
  SCREEN_PRIMARY_CTA_CLASS,
  "shadow-[0_8px_28px_rgba(0,0,0,0.45)]",
  PRIMARY_CTA_DISABLED_CLASS,
);

/** Alias — Score sticky filled actions. */
export const RESUME_REVIEW_PRIMARY_CTA_CLASS = PRIMARY_FLOATING_CTA_CLASS;

/** Floating / screen-sized blue outline CTA. */
export const PRIMARY_FLOATING_OUTLINE_CTA_CLASS = cn(
  SCREEN_PRIMARY_CTA_CLASS,
  SCREEN_PRIMARY_OUTLINE_CTA_CLASS,
);

/** Alias — Score sticky “Preview optimized resume”. */
export const RESUME_REVIEW_PREVIEW_CTA_CLASS = PRIMARY_FLOATING_OUTLINE_CTA_CLASS;

/** Drawer / modal / in-card blue outline CTA. */
export const SCREEN_REGULAR_PRIMARY_OUTLINE_CTA_CLASS = cn(
  SCREEN_REGULAR_CTA_CLASS,
  SCREEN_PRIMARY_OUTLINE_CTA_CLASS,
);

/** Canonical resume dropzone — matches Analyze screen field styling. */
export function resumeUploadZoneClassName(className?: string) {
  return cn(
    ANALYZE_FIELD_CLASS,
    "flex w-full cursor-pointer flex-col items-center justify-center gap-2 py-8 text-center transition-colors hover:bg-muted/55 disabled:cursor-not-allowed disabled:opacity-60",
    className,
  );
}
