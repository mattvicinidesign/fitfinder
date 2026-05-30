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
import { JOB_PARSE_SYSTEM, narrativeSystemPrompt, narrativeUserPayload } from "../_shared/prompts.ts";
import { scoreFit } from "../_shared/scoring.ts";
import { createUserClient, requireUser } from "../_shared/supabaseClient.ts";
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
    const userId = await requireUser(supabase);

    const body = await req.json().catch(() => ({}));
    const {
      jobText,
      companyName = null,
      jobTitle = null,
      resumeId,
      parsedResume,
      persist = true,
    } = body ?? {};

    if (typeof jobText !== "string" || jobText.trim().length === 0) {
      return error("jobText is required");
    }

    // 1. Resolve the parsed resume: inline > stored > empty.
    let resume: ParsedResume = EMPTY_RESUME;
    if (parsedResume) {
      resume = { ...EMPTY_RESUME, ...parsedResume };
    } else if (typeof resumeId === "string") {
      const { data, error: dbError } = await supabase
        .from("resumes")
        .select("parsed_resume_json")
        .eq("id", resumeId)
        .eq("user_id", userId)
        .maybeSingle();
      if (dbError) return error(`Failed to load resume: ${dbError.message}`, 500);
      if (data?.parsed_resume_json) {
        resume = { ...EMPTY_RESUME, ...data.parsed_resume_json };
      }
    }

    // 2. Parse the job description.
    const parsedJob = await completeJSON<ParsedJob>([
      { role: "system", content: JOB_PARSE_SYSTEM },
      { role: "user", content: jobText },
    ]);

    // 3. Deterministic scoring — the single source of truth.
    const score = scoreFit(resume, parsedJob);

    // 4. Narrative analysis layered on top of the computed scores.
    const narrative = await completeJSON<Narrative>([
      { role: "system", content: narrativeSystemPrompt() },
      { role: "user", content: narrativeUserPayload(resume, parsedJob, score) },
    ]);

    const result: AnalysisResult = {
      companyName,
      jobTitle,
      parsedJob,
      score,
      narrative,
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
