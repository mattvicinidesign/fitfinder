// POST /functions/v1/optimize-ats-keywords
// Body: { resumeId?: string, resumeText?: string, originalATSScore: number }
// Returns surgical ATS keyword scan results — not a rewritten resume.

import {
  ATS_NO_KEYWORDS_MESSAGE,
  buildAtsOptimizationScanResult,
} from "../_shared/ats_keyword_optimization.ts";
import { loadResumeText } from "../_shared/load_resume_text.ts";
import { createUserClient, requireUser } from "../_shared/supabaseClient.ts";
import { error, handlePreflight, json } from "../_shared/cors.ts";

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
      originalATSScore = null,
    } = body ?? {};

    if (typeof originalATSScore !== "number") {
      return error("originalATSScore is required.");
    }

    const storedResumeText = await loadResumeText(supabase, userId, {
      resumeId: typeof resumeId === "string" ? resumeId : null,
    });

    const resumeText =
      (typeof inlineResumeText === "string" && inlineResumeText.trim()
        ? inlineResumeText.trim()
        : null) ?? storedResumeText;

    if (!resumeText) {
      return error(
        "Resume text is required. Upload a resume or pass resumeText.",
      );
    }

    const scan = buildAtsOptimizationScanResult(resumeText, originalATSScore);

    if (scan.keywordChanges.length === 0) {
      return error(ATS_NO_KEYWORDS_MESSAGE, 422);
    }

    return json({ optimization: scan });
  } catch (e) {
    if (e instanceof Response) return e;
    return error((e as Error).message, 500);
  }
});
