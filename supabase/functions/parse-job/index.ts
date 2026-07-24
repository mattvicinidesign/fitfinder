// POST /functions/v1/parse-job
// Body: { jobText: string }
// Parses a raw job description into a ParsedJob. Stateless (no persistence).

import { requireAccountAccess } from "../_shared/account_access.ts";
import { enforceAiRateLimit } from "../_shared/ai_rate_limit.ts";
import { completeJSON } from "../_shared/openai.ts";
import { normalizeParsedJob } from "../_shared/normalize_parsed_job.ts";
import { assertJobTextSize } from "../_shared/payload_limits.ts";
import { JOB_PARSE_SYSTEM } from "../_shared/prompts.ts";
import { clientSafeErrorMessage } from "../_shared/safe_error.ts";
import { createUserClient } from "../_shared/supabaseClient.ts";
import { error, handlePreflight, json } from "../_shared/cors.ts";
import type { ParsedJob } from "../_shared/types.ts";

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") return error("Method not allowed", 405);

  try {
    const supabase = createUserClient(req);
    const access = await requireAccountAccess(supabase);
    await enforceAiRateLimit(
      supabase,
      "parse-job",
      access.accountType === "guest",
    );

    const { jobText } = await req.json().catch(() => ({}));
    if (typeof jobText !== "string" || jobText.trim().length === 0) {
      return error("jobText is required");
    }
    const jobTooLong = assertJobTextSize(jobText);
    if (jobTooLong) return error(jobTooLong, 413);

    const parsedRaw = await completeJSON<ParsedJob>([
      { role: "system", content: JOB_PARSE_SYSTEM },
      { role: "user", content: jobText },
    ]);
    const parsed = normalizeParsedJob(parsedRaw, jobText);

    return json({ parsedJob: parsed });
  } catch (e) {
    if (e instanceof Response) return e;
    return error(clientSafeErrorMessage(e), 500);
  }
});
