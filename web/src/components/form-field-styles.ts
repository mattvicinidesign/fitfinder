import { cn } from "@/lib/utils";

/** Label above a text field, select, or textarea. */
export const FORM_FIELD_LABEL_CLASS =
  "text-[13px] font-normal uppercase tracking-wide text-muted-foreground";

/** Vertical spacing between a field label and its control. */
export const FORM_FIELD_GROUP_CLASS = "flex flex-col gap-2";

/** 32px vertical spacing between stacked form sections (e.g. Name → Email). */
export const FORM_FIELDS_SECTION_GAP_CLASS = "gap-[32px]";

/** Vertical stack for profile/signup field sections. */
export const FORM_FIELDS_STACK_CLASS = cn(
  "flex flex-col px-4",
  FORM_FIELDS_SECTION_GAP_CLASS,
);

/** Shared 17px typography for profile/signup inputs and selects. */
export const FORM_FIELD_CONTROL_SIZE_CLASS =
  "text-[17px] font-normal leading-normal md:text-[17px]";

/** Text inputs: pure-white value, muted placeholder at the same size. */
export const FORM_FIELD_CONTROL_TEXT_CLASS = cn(
  FORM_FIELD_CONTROL_SIZE_CLASS,
  "text-foreground placeholder:text-[17px] placeholder:font-normal placeholder:text-muted-foreground md:placeholder:text-[17px]",
);
