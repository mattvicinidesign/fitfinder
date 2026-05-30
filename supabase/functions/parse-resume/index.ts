// POST /functions/v1/parse-resume
// Body: { resumeText?: string, resumeId?: string }
// Parses raw resume text into a ParsedResume. Pass resumeText directly, or
// resumeId to load the file from Storage (PDF, Word, or text) and extract text
// on the server. If resumeId is provided, the result is persisted (subject to RLS).

import { extractResumeTextFromStorage } from "../_shared/extractResumeText.ts";
import { completeJSON } from "../_shared/openai.ts";
import { normalizeParsedResume } from "../_shared/normalize_parsed_resume.ts";
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

    const { resumeText: inlineText, resumeId } = await req.json().catch(() => ({}));

    let resumeText =
      typeof inlineText === "string" ? inlineText.trim() : "";

    if (!resumeText && typeof resumeId === "string") {
      const { data: row, error: rowError } = await supabase
        .from("resumes")
        .select("file_url")
        .eq("id", resumeId)
        .eq("user_id", userId)
        .maybeSingle();
      if (rowError) {
        return error(`Failed to load resume: ${rowError.message}`, 500);
      }
      if (!row?.file_url) {
        return error("Resume file not found");
      }
      resumeText = await extractResumeTextFromStorage(supabase, row.file_url);
    }

    if (!resumeText) {
      return error("resumeText or resumeId is required");
    }

    const parsedRaw = await completeJSON<ParsedResume>([
      { role: "system", content: RESUME_PARSE_SYSTEM },
      { role: "user", content: resumeText },
    ]);
    const parsed = normalizeParsedResume(parsedRaw, resumeText);

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
