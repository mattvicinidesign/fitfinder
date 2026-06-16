// POST /functions/v1/generate-proposal
// Body: {
//   parsedResume: ParsedResume,        // resume used for the report
//   parsedJob: ParsedJob,              // parsed target job
//   jobDescription?: string,           // original JD text (preferred for tailoring)
//   jobTitle?: string,
//   companyName?: string,
//   strengths?: string[],              // narrative strengths from the report
//   gaps?: string[],                   // narrative gaps from the report
//   candidateName?: string,            // for the proposal signature
//   portfolioUrl?: string,             // optional, included verbatim if provided
//   reportId?: string                  // analysis/report id for traceability
// }
//
// Generates a job-tailored proposal plus a requirement→evidence mapping. This is
// additive to the analysis flow and never persists or mutates report data.

import { extractResumeTextFromStorage } from "../_shared/extractResumeText.ts";
import { completeJSON } from "../_shared/openai.ts";
import {
  compileProposalText,
  ensureMinimumRelevantProjects,
  injectPortfolioInIntroduction,
  normalizeProposalSections,
} from "../_shared/proposal_format.ts";
import { resolvePortfolioUrl } from "../_shared/portfolio_url.ts";
import { proposalSystemPrompt, proposalUserPayload } from "../_shared/prompts.ts";
import { normalizeParsedResume } from "../_shared/normalize_parsed_resume.ts";
import { createUserClient, requireUser, type SupabaseClient } from "../_shared/supabaseClient.ts";
import { error, handlePreflight, json } from "../_shared/cors.ts";
import type {
  ParsedJob,
  ParsedResume,
  ProposalGeneration,
  RequirementMatch,
} from "../_shared/types.ts";

const EMPTY_RESUME: ParsedResume = {
  skills: [],
  industries: [],
  workHistory: [],
  aiExperience: [],
  tools: [],
  archetypes: [],
};

interface ProposalDraft {
  jobRequirements?: unknown;
  evidenceMatches?: unknown;
  sections?: unknown;
  /** Legacy flat-text fallback if model omits sections. */
  proposalText?: unknown;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v.length > 0);
}

function normalizeEvidenceMatches(value: unknown): RequirementMatch[] {
  if (!Array.isArray(value)) return [];
  const out: RequirementMatch[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const requirement =
      typeof row.requirement === "string" ? row.requirement.trim() : "";
    if (!requirement) continue;
    const evidence = toStringArray(row.evidence);
    const confidenceRaw =
      typeof row.confidence === "number" ? row.confidence : Number(row.confidence);
    const confidence = Number.isFinite(confidenceRaw)
      ? Math.max(0, Math.min(100, Math.round(confidenceRaw)))
      : 0;
    out.push({ requirement, evidence, confidence });
  }
  return out;
}

async function loadResumeText(
  supabase: SupabaseClient,
  userId: string,
  opts: { resumeId?: string | null; reportId?: string | null },
): Promise<string | null> {
  let resumeId = opts.resumeId ?? null;

  if (!resumeId && opts.reportId) {
    const { data: analysis } = await supabase
      .from("analyses")
      .select("resume_id")
      .eq("id", opts.reportId)
      .eq("user_id", userId)
      .maybeSingle();
    resumeId = analysis?.resume_id ?? null;
  }

  if (!resumeId) return null;

  const { data: row, error: rowError } = await supabase
    .from("resumes")
    .select("file_url")
    .eq("id", resumeId)
    .eq("user_id", userId)
    .maybeSingle();

  if (rowError || !row?.file_url) return null;

  try {
    return await extractResumeTextFromStorage(supabase, row.file_url);
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") return error("Method not allowed", 405);

  try {
    const supabase = createUserClient(req);
    const userId = await requireUser(supabase);

    const body = await req.json().catch(() => ({}));
    const {
      parsedResume,
      parsedJob,
      jobDescription = null,
      jobTitle = null,
      companyName = null,
      strengths = [],
      gaps = [],
      candidateName = null,
      portfolioUrl = null,
      reportId = null,
      resumeId = null,
      resumeText: inlineResumeText = null,
    } = body ?? {};

    if (!parsedJob || typeof parsedJob !== "object") {
      return error("parsedJob is required");
    }

    const resume = normalizeParsedResume({
      ...EMPTY_RESUME,
      ...(parsedResume && typeof parsedResume === "object" ? parsedResume : {}),
    });

    const storedResumeText = await loadResumeText(supabase, userId, {
      resumeId: typeof resumeId === "string" ? resumeId : null,
      reportId: typeof reportId === "string" ? reportId : null,
    });

    const resumeText =
      (typeof inlineResumeText === "string" && inlineResumeText.trim()
        ? inlineResumeText.trim()
        : null) ?? storedResumeText;

    let portfolio = resolvePortfolioUrl({
      explicit:
        typeof portfolioUrl === "string" && portfolioUrl.trim()
          ? portfolioUrl.trim()
          : null,
      parsedResume: resume,
      resumeText,
    });

    const draft = await completeJSON<ProposalDraft>([
      { role: "system", content: proposalSystemPrompt() },
      {
        role: "user",
        content: proposalUserPayload({
          candidateName:
            typeof candidateName === "string" && candidateName.trim()
              ? candidateName.trim()
              : null,
          portfolioUrl: portfolio,
          resume,
          job: parsedJob as ParsedJob,
          jobTitle: typeof jobTitle === "string" ? jobTitle : null,
          companyName: typeof companyName === "string" ? companyName : null,
          jobDescription:
            typeof jobDescription === "string" ? jobDescription : null,
          strengths: toStringArray(strengths),
          gaps: toStringArray(gaps),
        }),
      },
    ]);

    const evidenceMatches = normalizeEvidenceMatches(draft.evidenceMatches);
    let sections = normalizeProposalSections(draft.sections, portfolio);

    if (sections && portfolio) {
      sections = { ...sections, portfolioUrl: portfolio };
    }

    if (sections) {
      sections = {
        ...sections,
        relevantProjects: ensureMinimumRelevantProjects(
          sections.relevantProjects,
          resume,
        ),
      };
    }

    let proposalText = "";
    if (sections) {
      proposalText = compileProposalText(sections);
    } else if (typeof draft.proposalText === "string") {
      proposalText = draft.proposalText.trim();
    }

    proposalText = injectPortfolioInIntroduction(proposalText, portfolio);

    if (!proposalText) {
      return error("The proposal service returned an empty proposal. Try again.", 502);
    }

    const proposal: ProposalGeneration = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      proposalText,
      sections: sections
        ? { ...sections, portfolioUrl: portfolio ?? sections.portfolioUrl }
        : undefined,
      jobRequirements: toStringArray(draft.jobRequirements),
      evidenceMatches,
      reportId: typeof reportId === "string" && reportId ? reportId : null,
    };

    return json({ proposal });
  } catch (e) {
    if (e instanceof Response) return e;
    return error((e as Error).message, 500);
  }
});
