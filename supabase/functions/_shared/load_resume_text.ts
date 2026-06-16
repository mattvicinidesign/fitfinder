import { extractResumeTextFromStorage } from "./extractResumeText.ts";
import type { SupabaseClient } from "./supabaseClient.ts";

/** Load plain resume text from Storage, optionally resolving resumeId via analyses. */
export async function loadResumeText(
  supabase: SupabaseClient,
  userId: string,
  opts: { resumeId?: string | null; reportId?: string | null },
): Promise<string | null> {
  let resumeId = opts.resumeId ?? null;

  if (!resumeId && opts.reportId) {
    const { data: analysis } = await supabase
      .from("analyses")
      .select("resume_id")
      .eq("id", opts.reportId)
      .eq("user_id", userId)
      .maybeSingle();
    resumeId = analysis?.resume_id ?? null;
  }

  if (!resumeId) return null;

  const { data: row, error: rowError } = await supabase
    .from("resumes")
    .select("file_url")
    .eq("id", resumeId)
    .eq("user_id", userId)
    .maybeSingle();

  if (rowError || !row?.file_url) return null;

  try {
    return await extractResumeTextFromStorage(supabase, row.file_url);
  } catch {
    return null;
  }
}
