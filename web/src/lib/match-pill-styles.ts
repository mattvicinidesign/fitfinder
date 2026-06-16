/** Green pill for a scoring match (summary card status pills). */
export const MATCH_PILL_CLASS =
  "bg-emerald-500/20 text-emerald-400 font-semibold";

/** Red pill for an identified non-match. */
export const MISMATCH_PILL_CLASS =
  "bg-red-500/20 text-red-400 font-semibold";

/** Blue pill for a partial onboarding preference match (e.g. France ∈ Europe). */
export const PARTIAL_MATCH_PILL_CLASS =
  "bg-sky-500/20 text-sky-400 font-semibold";

/** Neutral pill for identified values without a match verdict. */
export const NEUTRAL_PILL_CLASS = "bg-muted text-foreground font-medium";

/** Blue pill for not specified / missing posting values (muted, deemphasized). */
export const NOT_SPECIFIED_PILL_CLASS =
  "bg-sky-500/10 text-sky-400/55 font-medium";

/** @deprecated Use NOT_SPECIFIED_PILL_CLASS for missing posting values. */
export const MUTED_PILL_CLASS = NOT_SPECIFIED_PILL_CLASS;
