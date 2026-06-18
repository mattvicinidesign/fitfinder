// POST /functions/v1/review-resume
// Body: { resumeId?: string, resumeText?: string, parsedResume?: ParsedResume }
// Returns a resume-only health assessment (not job match scoring).

import { loadResumeText } from "../_shared/load_resume_text.ts";
import { completeJSON } from "../_shared/openai.ts";
import { normalizeParsedResume } from "../_shared/normalize_parsed_resume.ts";
import {
  RESUME_REVIEW_SYSTEM,
  resumeReviewUserPayload,
} from "../_shared/prompts.ts";
import { normalizeResumeReview } from "../_shared/resume_review_format.ts";
import { createUserClient, requireUser } from "../_shared/supabaseClient.ts";
import { error, handlePreflight, json } from "../_shared/cors.ts";
import type { ParsedResume } from "../_shared/types.ts";

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
      resumeId = null,
      resumeText: inlineResumeText = null,
      parsedResume = null,
    } = body ?? {};

    const resume = normalizeParsedResume({
      ...EMPTY_RESUME,
      ...(parsedResume && typeof parsedResume === "object" ? parsedResume : {}),
    });

    const storedResumeText = await loadResumeText(supabase, userId, {
      resumeId: typeof resumeId === "string" ? resumeId : null,
    });

    const resumeText =
      (typeof inlineResumeText === "string" && inlineResumeText.trim()
        ? inlineResumeText.trim()
        : null) ?? storedResumeText;

    if (!resumeText) {
      return error("Resume text is required. Upload a resume or pass resumeText.");
    }

    const draft = await completeJSON<Record<string, unknown>>([
      { role: "system", content: RESUME_REVIEW_SYSTEM },
      {
        role: "user",
        content: resumeReviewUserPayload({ resumeText, parsedResume: resume }),
      },
    ]);

    const review = normalizeResumeReview(
      draft,
      typeof resumeId === "string" && resumeId ? resumeId : null,
    );

    if (!review.overallScore && !review.categories.some((c) => c.findings.length)) {
      return error("The resume review service returned an empty result. Try again.", 502);
    }

    return json({ review });
  } catch (e) {
    if (e instanceof Response) return e;
    return error((e as Error).message, 500);
  }
});
