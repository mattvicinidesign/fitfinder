// POST /functions/v1/optimize-ats-keywords
// Body: { resumeId?: string, resumeText?: string, originalATSScore: number }
// Returns surgical ATS keyword scan results — not a rewritten resume.

import { requireAccountAccess } from "../_shared/account_access.ts";
import { enforceAiRateLimit } from "../_shared/ai_rate_limit.ts";
import {
  ATS_NO_KEYWORDS_MESSAGE,
  buildAtsOptimizationScanResult,
} from "../_shared/ats_keyword_optimization.ts";
import { loadResumeText } from "../_shared/load_resume_text.ts";
import { assertResumeTextSize } from "../_shared/payload_limits.ts";
import { clientSafeErrorMessage } from "../_shared/safe_error.ts";
import { createUserClient } from "../_shared/supabaseClient.ts";
import { error, handlePreflight, json } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") return error("Method not allowed", 405);

  try {
    const supabase = createUserClient(req);
    const access = await requireAccountAccess(supabase);
    await enforceAiRateLimit(
      supabase,
      "optimize-ats-keywords",
      access.accountType === "guest",
    );

    const body = await req.json().catch(() => ({}));
    const {
      resumeId = null,
      resumeText: inlineResumeText = null,
      originalATSScore = null,
    } = body ?? {};

    if (typeof originalATSScore !== "number") {
      return error("originalATSScore is required.");
    }

    const storedResumeText = await loadResumeText(supabase, access.userId, {
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
    const resumeTooLong = assertResumeTextSize(resumeText);
    if (resumeTooLong) return error(resumeTooLong, 413);

    const scan = buildAtsOptimizationScanResult(resumeText, originalATSScore);

    if (scan.keywordOpportunitiesFound === 0) {
      return error(ATS_NO_KEYWORDS_MESSAGE, 422);
    }

    return json({ optimization: scan });
  } catch (e) {
    if (e instanceof Response) return e;
    return error(clientSafeErrorMessage(e), 500);
  }
});
