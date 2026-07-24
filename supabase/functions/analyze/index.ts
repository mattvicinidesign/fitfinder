// POST /functions/v1/analyze
// Body: {
//   jobText: string,
//   companyName?: string,
//   jobTitle?: string,
//   resumeId?: string,           // use a stored, already-parsed resume
//   parsedResume?: ParsedResume, // or pass one inline
//   persist?: boolean            // default true: save an analyses row
// }
//
// This is the orchestrator and the ONLY place fit is computed. It parses the
// job, runs the semantic matching engine on resume + job text, asks the AI
// layer for a narrative, optionally stores the analysis, and returns the result.
//
// Access: scoringMode / account_type are resolved server-side only (JWT + DB).
// Client scoringMode / feature-access fields are ignored.

import { requireAccountAccess, resolveTrustedCategoryWeights } from "../_shared/account_access.ts";
import { enforceAiRateLimit } from "../_shared/ai_rate_limit.ts";
import { completeJSON } from "../_shared/openai.ts";
import { assertJobTextSize, assertResumeTextSize } from "../_shared/payload_limits.ts";
import { resolveJobTitle } from "../_shared/posting_details.ts";
import { normalizeParsedJob } from "../_shared/normalize_parsed_job.ts";
import { normalizeParsedResume } from "../_shared/normalize_parsed_resume.ts";
import { loadResumeText } from "../_shared/load_resume_text.ts";
import { JOB_PARSE_SYSTEM, narrativeSystemPrompt, narrativeUserPayload } from "../_shared/prompts.ts";
import { clientSafeErrorMessage } from "../_shared/safe_error.ts";
import { parsedResumeToText } from "../_shared/semantic_match/resume_text.ts";
import { resolvePostingContext } from "../_shared/posting_context.ts";
import { scoreFit } from "../_shared/scoring.ts";
import { createUserClient } from "../_shared/supabaseClient.ts";
import { error, handlePreflight, json } from "../_shared/cors.ts";
import type { AnalysisResult, Narrative, ParsedJob, ParsedResume } from "../_shared/types.ts";

const EMPTY_RESUME: ParsedResume = {
  skills: [],
  industries: [],
  workHistory: [],
  aiExperience: [],
  tools: [],
  archetypes: [],
};

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") return error("Method not allowed", 405);

  try {
    const supabase = createUserClient(req);
    const access = await requireAccountAccess(supabase);
    await enforceAiRateLimit(
      supabase,
      "analyze",
      access.accountType === "guest",
    );

    const body = await req.json().catch(() => ({}));
    const {
      jobText,
      companyName = null,
      jobTitle = null,
      resumeId,
      resumeText: inlineResumeText = null,
      parsedResume,
      persist = true,
      // Intentionally ignored: scoringMode / account_type from the client.
      categoryWeights: requestedCategoryWeights = null,
    } = body ?? {};

    if (typeof jobText !== "string" || jobText.trim().length === 0) {
      return error("jobText is required");
    }
    const jobTooLong = assertJobTextSize(jobText);
    if (jobTooLong) return error(jobTooLong, 413);

    // 1. Resolve the parsed resume: inline > stored > empty.
    let resume: ParsedResume = EMPTY_RESUME;
    const resumeIdValue = typeof resumeId === "string" ? resumeId : null;
    let resumeTextForNormalize: string | null = null;
    if (resumeIdValue) {
      resumeTextForNormalize = await loadResumeText(supabase, access.userId, {
        resumeId: resumeIdValue,
      });
    }

    if (parsedResume) {
      resume = normalizeParsedResume(
        { ...EMPTY_RESUME, ...parsedResume },
        resumeTextForNormalize ?? undefined,
      );
    } else if (resumeIdValue) {
      const { data, error: dbError } = await supabase
        .from("resumes")
        .select("parsed_resume_json")
        .eq("id", resumeId)
        .eq("user_id", access.userId)
        .maybeSingle();
      if (dbError) return error("Failed to load resume.", 500);
      if (data?.parsed_resume_json) {
        resume = normalizeParsedResume(
          {
            ...EMPTY_RESUME,
            ...data.parsed_resume_json,
          },
          resumeTextForNormalize ?? undefined,
        );
      }
    }

    // 2. Scoring mode from auth/DB only — never from the request body.
    const scoringMode = access.scoringMode;

    const { data: profileWeightsRow } = await supabase
      .from("profiles")
      .select("match_score_weights")
      .eq("user_id", access.userId)
      .maybeSingle();

    const resumeTextForScoring =
      (typeof inlineResumeText === "string" ? inlineResumeText.trim() : "") ||
      resumeTextForNormalize?.trim() ||
      parsedResumeToText(resume);

    if (!resumeTextForScoring) {
      return error("Resume text is required. Upload a resume or pass resumeText.");
    }
    const resumeTooLong = assertResumeTextSize(resumeTextForScoring);
    if (resumeTooLong) return error(resumeTooLong, 413);

    // Guests cannot inject Preferences weights via the request body.
    const categoryWeights = resolveTrustedCategoryWeights(
      scoringMode,
      requestedCategoryWeights,
      profileWeightsRow?.match_score_weights ?? null,
    );

    const [parsedJobRaw, score] = await Promise.all([
      completeJSON<ParsedJob>([
        { role: "system", content: JOB_PARSE_SYSTEM },
        { role: "user", content: jobText },
      ]),
      scoreFit(resumeTextForScoring, jobText, {
        mode: scoringMode,
        jobTitle,
        jobText,
        categoryWeights,
      }),
    ]);

    const parsedJob = normalizeParsedJob(parsedJobRaw, jobText, jobTitle);
    const postingContext = resolvePostingContext(parsedJob, jobText);

    // 3. Narrative analysis layered on top of the computed scores.
    const narrative = await completeJSON<Narrative>([
      { role: "system", content: narrativeSystemPrompt() },
      { role: "user", content: narrativeUserPayload(resume, parsedJob, score) },
    ]);

    const resolvedJobTitle =
      resolveJobTitle(jobTitle, jobText, parsedJob.roleTitle) ?? null;

    const result: AnalysisResult = {
      companyName,
      jobTitle: resolvedJobTitle,
      parsedJob,
      parsedResume: resume,
      jobDescription: jobText,
      score,
      narrative,
      postingContext,
    };

    // 4. Persist (subject to RLS) unless the caller opts out.
    let analysisId: string | null = null;
    if (persist) {
      const { data, error: dbError } = await supabase
        .from("analyses")
        .insert({
          user_id: access.userId,
          resume_id: typeof resumeId === "string" ? resumeId : null,
          company_name: companyName,
          job_title: resolvedJobTitle,
          job_description: jobText,
          parsed_job_json: parsedJob,
          qualification_score: score.qualificationScore,
          fit_score: score.fitScore,
          confidence_score: score.confidenceScore,
          career_fit_adjustment: score.careerFitAdjustment,
          recommendation: score.recommendation,
          recommendation_label: score.recommendationLabel,
          narrative_json: narrative,
        })
        .select("id")
        .single();
      if (dbError) return error("Failed to save analysis.", 500);
      analysisId = data.id;
    }

    return json({ analysisId, result });
  } catch (e) {
    if (e instanceof Response) return e;
    return error(clientSafeErrorMessage(e), 500);
  }
});
