import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { extractDocumentText } from "./openai.ts";

const TEXT_EXTENSIONS = /\.(txt|md|markdown)$/i;

/** Load resume bytes from Storage and return plain text. */
export async function extractResumeTextFromStorage(
  supabase: SupabaseClient,
  storagePath: string,
): Promise<string> {
  const { data: blob, error } = await supabase.storage
    .from("resumes")
    .download(storagePath);
  if (error) {
    throw new Error(`Could not download resume: ${error.message}`);
  }

  const filename = storagePath.split("/").pop() ?? "resume";

  if (TEXT_EXTENSIONS.test(filename)) {
    const text = (await blob.text()).trim();
    if (text) return text;
  }

  const bytes = new Uint8Array(await blob.arrayBuffer());
  return extractDocumentText(filename, bytes);
}
