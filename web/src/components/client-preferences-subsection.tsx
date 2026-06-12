"use client";

import { formatPreferenceMatchSentence } from "@/lib/client-preferences-display";
import type { SectionFieldScore } from "@/lib/section-field-scoring";

/** Matched client preferences (location, timezone, AI) as a single sentence. */
export function ClientPreferencesSubsection({
  fields,
}: {
  fields: SectionFieldScore[];
}) {
  const sentence = formatPreferenceMatchSentence(fields);
  if (!sentence) return null;

  return (
    <div className="mt-4 border-t border-border/60 pt-4 min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
        preference match
      </p>
      <p className="text-[13px] font-medium leading-snug text-foreground">
        {sentence}
      </p>
    </div>
  );
}
