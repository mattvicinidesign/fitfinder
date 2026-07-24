// POST /functions/v1/parse-resume
// Body: { resumeText?: string, resumeId?: string, textOnly?: boolean }
// Parses raw resume text into a ParsedResume. Pass resumeText directly, or
// resumeId to load the file from Storage (PDF, Word, or text) and extract text
// on the server. Set textOnly: true with resumeId to return resumeText only (no OpenAI).
// If resumeId is provided without textOnly, the result is persisted (subject to RLS).

import { requireAccountAccess } from "../_shared/account_access.ts";
import { enforceAiRateLimit } from "../_shared/ai_rate_limit.ts";
import { extractResumeTextFromStorage } from "../_shared/extractResumeText.ts";
import { completeJSON } from "../_shared/openai.ts";
import { normalizeParsedResume } from "../_shared/normalize_parsed_resume.ts";
import { assertResumeTextSize } from "../_shared/payload_limits.ts";
import { mergeProfileQualifiedFromParsed } from "../_shared/sync_profile_qualified.ts";
import { RESUME_PARSE_SYSTEM } from "../_shared/prompts.ts";
import { clientSafeErrorMessage } from "../_shared/safe_error.ts";
import {
  createUserClient,
  type SupabaseClient,
} from "../_shared/supabaseClient.ts";
import { error, handlePreflight, json } from "../_shared/cors.ts";
import type { ParsedResume } from "../_shared/types.ts";

function isRetriableDbError(message: string): boolean {
  return /connection (error|reset)|timed out|fetch failed|broken pipe|unexpected eof/i.test(
    message,
  );
}

async function persistParsedResume(
  supabase: SupabaseClient,
  resumeId: string,
  userId: string,
  parsed: ParsedResume,
): Promise<string | null> {
  const attempts = 3;
  let lastMessage = "Unknown database error";

  for (let attempt = 0; attempt < attempts; attempt++) {
    const { error: dbError } = await supabase
      .from("resumes")
      .update({ parsed_resume_json: parsed })
      .eq("id", resumeId)
      .eq("user_id", userId);

    if (!dbError) return null;

    lastMessage = dbError.message;
    if (!isRetriableDbError(lastMessage) || attempt === attempts - 1) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
  }

  return lastMessage;
}

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") return error("Method not allowed", 405);

  try {
    const supabase = createUserClient(req);
    const access = await requireAccountAccess(supabase);
    const userId = access.userId;

    const body = await req.json().catch(() => ({}));
    const {
      resumeText: inlineText,
      resumeId,
      textOnly = false,
    } = body ?? {};

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
        return error("Failed to load resume.", 500);
      }
      if (!row?.file_url) {
        return error("Resume file not found");
      }
      resumeText = await extractResumeTextFromStorage(supabase, row.file_url);
    }

    if (!resumeText) {
      return error("resumeText or resumeId is required");
    }
    const resumeTooLong = assertResumeTextSize(resumeText);
    if (resumeTooLong) return error(resumeTooLong, 413);

    if (textOnly === true) {
      return json({ resumeText });
    }

    await enforceAiRateLimit(
      supabase,
      "parse-resume",
      access.accountType === "guest",
    );

    const parsedRaw = await completeJSON<ParsedResume>([
      { role: "system", content: RESUME_PARSE_SYSTEM },
      { role: "user", content: resumeText },
    ]);
    const parsed = normalizeParsedResume(parsedRaw, resumeText);

    let persisted = true;
    let persistWarning: string | null = null;

    if (typeof resumeId === "string") {
      const persistError = await persistParsedResume(
        supabase,
        resumeId,
        userId,
        parsed,
      );
      if (persistError) {
        persisted = false;
        persistWarning = persistError;
        console.error(`Failed to persist parsed resume: ${persistError}`);
      }

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("qualified_industries, qualified_skills")
        .eq("user_id", userId)
        .maybeSingle();

      const qualified = mergeProfileQualifiedFromParsed(
        profileRow ?? undefined,
        parsed,
      );
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          qualified_industries: qualified.qualified_industries,
          qualified_skills: qualified.qualified_skills,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (profileError) {
        console.error(
          `Failed to sync profile qualifications: ${profileError.message}`,
        );
      }
    }

    return json({
      parsedResume: parsed,
      persisted,
      ...(persistWarning ? { persistWarning } : {}),
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return error(clientSafeErrorMessage(e), 500);
  }
});
