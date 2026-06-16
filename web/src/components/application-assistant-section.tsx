"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ProposalEditorDrawer } from "@/components/proposal-editor-drawer";
import { ReportRevealSection } from "@/components/report-reveal-section";
import { Button } from "@/components/ui/button";
import { generateProposal } from "@/lib/api";
import { fetchUserDisplayName } from "@/lib/profile";
import { resolvePortfolioUrl } from "@/lib/portfolio-url";
import { injectPortfolioInIntroduction } from "@/lib/proposal-format";
import { loadProposal, saveProposal } from "@/lib/proposal-cache";
import type {
  Narrative,
  ParsedJob,
  ParsedResume,
  ProposalGeneration,
} from "@/lib/types";

export function ApplicationAssistantSection({
  reportId,
  resumeId,
  parsedJob,
  parsedResume,
  narrative,
  jobDescription,
  jobTitle,
  companyName,
}: {
  reportId?: string | null;
  resumeId?: string | null;
  parsedJob?: ParsedJob;
  parsedResume?: ParsedResume | null;
  narrative?: Narrative | null;
  jobDescription?: string | null;
  jobTitle?: string | null;
  companyName?: string | null;
}) {
  const [proposal, setProposal] = useState<ProposalGeneration | null>(null);
  const [proposalText, setProposalText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [candidateName, setCandidateName] = useState<string | null>(null);
  const loadedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchUserDisplayName().then((name) => {
      if (active) setCandidateName(name);
    });
    return () => {
      active = false;
    };
  }, []);

  // Restore a cached proposal for this report (session-scoped).
  useEffect(() => {
    const key = reportId ?? null;
    if (loadedKeyRef.current === key) return;
    loadedKeyRef.current = key;
    const cached = loadProposal(key);
    if (cached) {
      setProposal(cached);
      setProposalText(cached.proposalText);
    } else {
      setProposal(null);
      setProposalText("");
    }
  }, [reportId]);

  if (!parsedJob) return null;

  const portfolioUrl = resolvePortfolioUrl({ parsedResume: parsedResume ?? null });

  async function runGeneration(mode: "generate" | "regenerate") {
    if (generating) return;
    setGenerating(true);
    try {
      const next = await generateProposal({
        parsedResume,
        parsedJob: parsedJob!,
        jobDescription,
        jobTitle,
        companyName,
        strengths: narrative?.strengths ?? [],
        gaps: narrative?.gaps ?? [],
        candidateName,
        portfolioUrl,
        reportId,
        resumeId,
      });
      const resolvedPortfolio =
        resolvePortfolioUrl({
          explicit: next.sections?.portfolioUrl ?? portfolioUrl,
          parsedResume: parsedResume ?? null,
        }) ?? portfolioUrl;
      const text = injectPortfolioInIntroduction(
        next.proposalText,
        resolvedPortfolio,
      );
      const patched = {
        ...next,
        proposalText: text,
        sections: next.sections
          ? { ...next.sections, portfolioUrl: resolvedPortfolio ?? next.sections.portfolioUrl }
          : next.sections,
      };
      setProposal(patched);
      setProposalText(text);
      saveProposal(reportId, patched);
      if (mode === "regenerate") toast.success("Proposal regenerated.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Couldn't generate the proposal.",
      );
    } finally {
      setGenerating(false);
    }
  }

  function handleProposalTextChange(value: string) {
    setProposalText(value);
    if (proposal) {
      const updated = { ...proposal, proposalText: value };
      setProposal(updated);
      saveProposal(reportId, updated);
    }
  }

  const hasProposal = proposal != null;

  return (
    <>
      <ReportRevealSection>
        <section
          className="rounded-xl border border-border/80 bg-muted/35 px-3.5 py-3.5"
          aria-labelledby="application-assistant-title"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Sparkles className="size-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <h2
                id="application-assistant-title"
                className="text-[16px] font-semibold leading-snug text-foreground"
              >
                Application Assistant
              </h2>
              <p className="text-[13px] text-muted-foreground leading-snug">
                Generate a personalized proposal based on your resume and the
                target job.
              </p>
            </div>
          </div>

          <div className="mt-3.5">
            <Button
              type="button"
              className="h-11 w-full gap-2 rounded-xl"
              onClick={() => {
                if (hasProposal) setDrawerOpen(true);
                else void runGeneration("generate");
              }}
              disabled={generating}
              aria-busy={generating && !hasProposal}
            >
              {generating && !hasProposal ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : hasProposal ? (
                <FileText className="size-4" aria-hidden />
              ) : (
                <Sparkles className="size-4" aria-hidden />
              )}
              {generating && !hasProposal
                ? "Generating…"
                : hasProposal
                  ? "View Proposal"
                  : "Generate Proposal"}
            </Button>
          </div>
        </section>
      </ReportRevealSection>

      {hasProposal ? (
        <ProposalEditorDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          proposal={proposal}
          proposalText={proposalText}
          onProposalTextChange={handleProposalTextChange}
          onRegenerate={() => void runGeneration("regenerate")}
          regenerating={generating}
          candidateName={candidateName}
          jobTitle={jobTitle ?? null}
          companyName={companyName ?? null}
          portfolioUrl={portfolioUrl}
        />
      ) : null}
    </>
  );
}
