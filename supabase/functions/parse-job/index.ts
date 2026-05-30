// POST /functions/v1/parse-job
// Body: { jobText: string }
// Parses a raw job description into a ParsedJob. Stateless (no persistence).

import { completeJSON } from "../_shared/openai.ts";
import { JOB_PARSE_SYSTEM } from "../_shared/prompts.ts";
import { createUserClient, requireUser } from "../_shared/supabaseClient.ts";
import { error, handlePreflight, json } from "../_shared/cors.ts";
import type { ParsedJob } from "../_shared/types.ts";

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") return error("Method not allowed", 405);

  try {
    const supabase = createUserClient(req);
    await requireUser(supabase);

    const { jobText } = await req.json().catch(() => ({}));
    if (typeof jobText !== "string" || jobText.trim().length === 0) {
      return error("jobText is required");
    }

    const parsed = await completeJSON<ParsedJob>([
      { role: "system", content: JOB_PARSE_SYSTEM },
      { role: "user", content: jobText },
    ]);

    return json({ parsedJob: parsed });
  } catch (e) {
    if (e instanceof Response) return e;
    return error((e as Error).message, 500);
  }
});
