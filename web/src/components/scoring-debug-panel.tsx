"use client";

import type { OpportunityEngineDebug } from "@/lib/types";
import { cn } from "@/lib/utils";

function DebugSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-1.5", className)}>
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
        {title}
      </h3>
      <div className="rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 p-3 text-[12px] leading-relaxed text-foreground/90">
        {children}
      </div>
    </section>
  );
}

function DebugList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-muted-foreground">—</p>;
  }
  return (
    <ul className="list-disc space-y-0.5 pl-4">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function DebugJson({ value }: { value: Record<string, unknown> }) {
  return (
    <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px]">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

/** Hidden developer view — explains every score component from the Opportunity Engine. */
export function ScoringDebugPanel({ debug }: { debug: OpportunityEngineDebug }) {
  return (
    <div
      className="rounded-xl border border-amber-500/30 bg-amber-500/[0.03] p-4 space-y-4"
      data-testid="scoring-debug-panel"
    >
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-400">
          Developer — Opportunity Engine
        </p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Auditable scoring breakdown (development / ?debug=scoring only).
        </p>
      </div>

      <DebugSection title="Final reasoning">
        <p>{debug.finalReasoning || "—"}</p>
      </DebugSection>

      <div className="grid gap-4 sm:grid-cols-2">
        <DebugSection title="Detected role archetype">
          <p>
            {debug.detectedRoleArchetype ?? "Unknown"}{" "}
            <span className="text-muted-foreground">({debug.roleArchetypeTier})</span>
          </p>
        </DebugSection>
        <DebugSection title="Detected industries">
          <DebugList items={debug.detectedIndustries} />
        </DebugSection>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <DebugSection title="Matched qualifications">
          <DebugList items={debug.matchedQualifications} />
        </DebugSection>
        <DebugSection title="Missing qualifications">
          <DebugList items={debug.missingQualifications} />
        </DebugSection>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <DebugSection title="Profile preferences applied">
          <DebugList items={debug.preferencesApplied} />
        </DebugSection>
        <DebugSection title="Red flags triggered">
          <DebugList items={debug.redFlagsTriggered} />
        </DebugSection>
      </div>

      <DebugSection title="Raw category scores">
        <ul className="space-y-2">
          {debug.categoryScores.map((c) => (
            <li key={c.category} className="font-mono text-[11px]">
              {c.label}: {c.score}% × weight {c.weight}% = contribution {c.contribution}
              {c.matchedCount != null && c.totalCount != null
                ? ` (${c.matchedCount}/${c.totalCount})`
                : ""}
              {c.details?.length ? (
                <span className="block text-muted-foreground">{c.details.join(" · ")}</span>
              ) : null}
            </li>
          ))}
        </ul>
      </DebugSection>

      <DebugSection title="Weighting calculation">
        <p className="font-mono text-[11px]">{debug.weightingCalculation || "—"}</p>
      </DebugSection>

      <DebugSection title="Parsed job metadata">
        <DebugJson value={debug.parsedJobMetadata} />
      </DebugSection>
    </div>
  );
}
