// POST /functions/v1/parse-resume
// Body: { resumeText: string, resumeId?: string }
// Parses raw resume text into a ParsedResume. If resumeId is provided, the
// result is persisted to resumes.parsed_resume_json (subject to RLS).

import { completeJSON } from "../_shared/openai.ts";
import { RESUME_PARSE_SYSTEM } from "../_shared/prompts.ts";
import { createUserClient, requireUser } from "../_shared/supabaseClient.ts";
import { error, handlePreflight, json } from "../_shared/cors.ts";
import type { ParsedResume } from "../_shared/types.ts";

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") return error("Method not allowed", 405);

  try {
    const supabase = createUserClient(req);
    const userId = await requireUser(supabase);

    const { resumeText, resumeId } = await req.json().catch(() => ({}));
    if (typeof resumeText !== "string" || resumeText.trim().length === 0) {
      return error("resumeText is required");
    }

    const parsed = await completeJSON<ParsedResume>([
      { role: "system", content: RESUME_PARSE_SYSTEM },
      { role: "user", content: resumeText },
    ]);

    if (typeof resumeId === "string") {
      const { error: dbError } = await supabase
        .from("resumes")
        .update({ parsed_resume_json: parsed })
        .eq("id", resumeId)
        .eq("user_id", userId);
      if (dbError) return error(`Failed to persist parsed resume: ${dbError.message}`, 500);
    }

    return json({ parsedResume: parsed });
  } catch (e) {
    if (e instanceof Response) return e;
    return error((e as Error).message, 500);
  }
});
