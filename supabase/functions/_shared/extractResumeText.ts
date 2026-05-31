import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { extractDocxText } from "./extractDocx.ts";
import { extractDocumentText } from "./openai.ts";

const TEXT_EXTENSIONS = /\.(txt|md|markdown)$/i;
const DOCX_EXTENSIONS = /\.docx$/i;
const PDF_EXTENSIONS = /\.pdf$/i;

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
  const lower = filename.toLowerCase();

  if (TEXT_EXTENSIONS.test(lower)) {
    const text = (await blob.text()).trim();
    if (text) return text;
  }

  const bytes = new Uint8Array(await blob.arrayBuffer());

  if (DOCX_EXTENSIONS.test(lower)) {
    return extractDocxText(bytes);
  }

  if (PDF_EXTENSIONS.test(lower)) {
    return extractDocumentText(filename, bytes);
  }

  throw new Error(
    "Unsupported resume format. Upload PDF, Word (.docx), or plain text.",
  );
}
