import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { extractDocxText } from "./extractDocx.ts";
import { extractDocumentText } from "./openai.ts";
import {
  assertResumeFileBytes,
  assertResumeFilename,
  assertResumeTextSize,
} from "./payload_limits.ts";

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
    throw new Error("Could not download resume.");
  }

  const filename = storagePath.split("/").pop() ?? "resume";
  const badName = assertResumeFilename(filename);
  if (badName) throw new Error(badName);

  const lower = filename.toLowerCase();

  if (TEXT_EXTENSIONS.test(lower)) {
    const text = (await blob.text()).trim();
    if (text) {
      const tooLong = assertResumeTextSize(text);
      if (tooLong) throw new Error(tooLong);
      return text;
    }
  }

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const tooBig = assertResumeFileBytes(bytes.length);
  if (tooBig) throw new Error(tooBig);

  if (DOCX_EXTENSIONS.test(lower)) {
    const text = await extractDocxText(bytes);
    const tooLong = assertResumeTextSize(text);
    if (tooLong) throw new Error(tooLong);
    return text;
  }

  if (PDF_EXTENSIONS.test(lower)) {
    const text = await extractDocumentText(filename, bytes);
    const tooLong = assertResumeTextSize(text);
    if (tooLong) throw new Error(tooLong);
    return text;
  }

  throw new Error(
    "Unsupported resume format. Upload PDF, Word (.docx), or plain text.",
  );
}
