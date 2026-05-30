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
// job, runs the deterministic scoring engine, asks the AI layer for a
// narrative, optionally stores the analysis, and returns the full result.

import { completeJSON } from "../_shared/openai.ts";
import { normalizeParsedJob } from "../_shared/normalize_parsed_job.ts";
import { normalizeParsedResume } from "../_shared/normalize_parsed_resume.ts";
import { resumeWithQualifiedIndustries } from "../_shared/qualified_industries.ts";
import { compensationFromProfileRow } from "../_shared/profile_compensation.ts";
import { JOB_PARSE_SYSTEM, narrativeSystemPrompt, narrativeUserPayload } from "../_shared/prompts.ts";
import { resolvePostingContext } from "../_shared/posting_context.ts";
import { scoreFit } from "../_shared/scoring.ts";
import { createUserClient, requireUser } from "../_shared/supabaseClient.ts";
import { error, handlePreflight, json } from "../_shared/cors.ts";
import type { AnalysisResult, Narrative, ParsedJob, ParsedResume } from "../_shared/types.ts";
import type { ScoringMode } from "../_shared/scoring_constants.ts";

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
    const userId = await requireUser(supabase);

    const body = await req.json().catch(() => ({}));
    const {
      jobText,
      companyName = null,
      jobTitle = null,
      resumeId,
      parsedResume,
      persist = true,
      scoringMode: requestedScoringMode,
    } = body ?? {};

    if (typeof jobText !== "string" || jobText.trim().length === 0) {
      return error("jobText is required");
    }
    if (jobText.length > 120_000) {
      return error(
        "Job description is too long. Paste only the role requirements (under ~120k characters).",
        413,
      );
    }

    // 1. Resolve the parsed resume: inline > stored > empty.
    let resume: ParsedResume = EMPTY_RESUME;
    if (parsedResume) {
      resume = normalizeParsedResume(
        { ...EMPTY_RESUME, ...parsedResume },
      );
    } else if (typeof resumeId === "string") {
      const { data, error: dbError } = await supabase
        .from("resumes")
        .select("parsed_resume_json")
        .eq("id", resumeId)
        .eq("user_id", userId)
        .maybeSingle();
      if (dbError) return error(`Failed to load resume: ${dbError.message}`, 500);
      if (data?.parsed_resume_json) {
        resume = normalizeParsedResume({
          ...EMPTY_RESUME,
          ...data.parsed_resume_json,
        });
      }
    }

    // 2. Parse the job description.
    const parsedJobRaw = await completeJSON<ParsedJob>([
      { role: "system", content: JOB_PARSE_SYSTEM },
      { role: "user", content: jobText },
    ]);
    const parsedJob = normalizeParsedJob(parsedJobRaw, jobText);

    // Profile desired pay fills in when resume parse omits desiredCompensation.
    const { data: profileRow } = await supabase
      .from("profiles")
      .select(
        "desired_compensation, desired_compensation_min, desired_compensation_max, desired_compensation_currency, desired_compensation_period, qualified_industries, country, timezone",
      )
      .eq("user_id", userId)
      .maybeSingle();

    const profileDesired = compensationFromProfileRow(profileRow ?? undefined);
    if (profileDesired && !resume.desiredCompensation) {
      resume = { ...resume, desiredCompensation: profileDesired };
    }

    // 3. Deterministic V1 qualification engine (guest vs registered weights).
    const { data: userRow } = await supabase
      .from("users")
      .select("account_type")
      .eq("id", userId)
      .maybeSingle();

    let scoringMode: ScoringMode =
      userRow?.account_type === "guest" ? "guest" : "registered";
    // Dev/QA clients may request full 10-category scoring (e.g. NEXT_PUBLIC_QA_REGISTERED_SCORING).
    if (requestedScoringMode === "registered") {
      scoringMode = "registered";
    }

    const profileCountry =
      typeof profileRow?.country === "string" && profileRow.country.trim()
        ? profileRow.country.trim()
        : null;
    const profileTimezone =
      typeof profileRow?.timezone === "string" && profileRow.timezone.trim()
        ? profileRow.timezone.trim()
        : null;

    const resumeForScoring = {
      ...resume,
      country: resume.country?.trim() || profileCountry || resume.country,
      timezone: resume.timezone?.trim() || profileTimezone || resume.timezone,
      industries: resumeWithQualifiedIndustries(
        resume.industries,
        profileRow?.qualified_industries as string[] | null | undefined,
      ),
    };

    const score = scoreFit(resumeForScoring, parsedJob, {
      mode: scoringMode,
      jobTitle,
    });

    // 4. Narrative analysis layered on top of the computed scores.
    const narrative = await completeJSON<Narrative>([
      { role: "system", content: narrativeSystemPrompt() },
      { role: "user", content: narrativeUserPayload(resume, parsedJob, score) },
    ]);

    const postingContext = resolvePostingContext(parsedJob);

    const result: AnalysisResult = {
      companyName,
      jobTitle,
      parsedJob,
      parsedResume: resume,
      jobDescription: jobText,
      score,
      narrative,
      postingContext,
    };

    // 5. Persist (subject to RLS) unless the caller opts out.
    let analysisId: string | null = null;
    if (persist) {
      const { data, error: dbError } = await supabase
        .from("analyses")
        .insert({
          user_id: userId,
          resume_id: typeof resumeId === "string" ? resumeId : null,
          company_name: companyName,
          job_title: jobTitle,
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
      if (dbError) return error(`Failed to save analysis: ${dbError.message}`, 500);
      analysisId = data.id;
    }

    return json({ analysisId, result });
  } catch (e) {
    if (e instanceof Response) return e;
    return error((e as Error).message, 500);
  }
});
