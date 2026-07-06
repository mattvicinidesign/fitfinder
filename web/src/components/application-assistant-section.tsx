"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Sparkles } from "lucide-react";
import { CtaSpinner } from "@/components/ui/cta-spinner";
import { toast } from "sonner";
import { ProposalEditorDrawer } from "@/components/proposal-editor-drawer";
import { Button } from "@/components/ui/button";
import { StickyBottomCta } from "@/components/ui/sticky-bottom-cta";
import { generateProposal } from "@/lib/api";
import { fetchUserDisplayName } from "@/lib/profile";
import { resolvePortfolioUrl } from "@/lib/portfolio-url";
import { injectPortfolioInIntroduction } from "@/lib/proposal-format";
import { loadProposal, saveProposal } from "@/lib/proposal-cache";
import { cn } from "@/lib/utils";
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
      setDrawerOpen(true);
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
      <StickyBottomCta variant="floating" scrollFade inactive={generating}>
        <Button
          type="button"
          className={cn(
            "h-12 w-full gap-2 rounded-xl text-[17px] font-semibold",
            "shadow-[0_8px_28px_rgba(0,0,0,0.45)]",
          )}
          onClick={() => {
            if (hasProposal) setDrawerOpen(true);
            else void runGeneration("generate");
          }}
          disabled={generating}
          aria-busy={generating && !hasProposal}
          aria-label={
            hasProposal ? "View generated proposal" : "Generate proposal"
          }
        >
          {generating && !hasProposal ? (
            <CtaSpinner className="size-4" />
          ) : hasProposal ? (
            <FileText className="size-4" aria-hidden />
          ) : (
            <Sparkles className="size-4" aria-hidden />
          )}
          {generating && !hasProposal
            ? null
            : hasProposal
              ? "View Proposal"
              : "Generate Proposal"}
        </Button>
      </StickyBottomCta>

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
