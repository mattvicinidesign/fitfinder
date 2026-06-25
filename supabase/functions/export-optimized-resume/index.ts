// POST /functions/v1/export-optimized-resume
// Body: { resumeId, substitutions, patchedText, sourceFileName? }
// Returns patched resume bytes as base64 for native export.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import {
  bytesToBase64,
  exportOptimizedResumeBytes,
} from "../_shared/export_optimized_resume.ts";
import type { AtsKeywordChange } from "../_shared/patch_resume_docx.ts";
import { createUserClient, requireUser } from "../_shared/supabaseClient.ts";
import { error, handlePreflight, json } from "../_shared/cors.ts";

async function downloadResumeBytes(
  supabase: SupabaseClient,
  userId: string,
  resumeId: string,
): Promise<{ bytes: Uint8Array; fileName: string }> {
  const { data: row, error: rowError } = await supabase
    .from("resumes")
    .select("file_url")
    .eq("id", resumeId)
    .eq("user_id", userId)
    .maybeSingle();

  if (rowError || !row?.file_url) {
    throw new Error("Resume not found.");
  }

  const { data: blob, error: downloadError } = await supabase.storage
    .from("resumes")
    .download(row.file_url);

  if (downloadError || !blob) {
    throw new Error("Could not download resume file.");
  }

  return {
    bytes: new Uint8Array(await blob.arrayBuffer()),
    fileName: row.file_url.split("/").pop() ?? "resume.pdf",
  };
}

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") return error("Method not allowed", 405);

  try {
    const supabase = createUserClient(req);
    const userId = await requireUser(supabase);
    const body = await req.json().catch(() => ({}));

    const resumeId = typeof body?.resumeId === "string"
      ? body.resumeId.trim()
      : "";
    if (!resumeId) return error("resumeId is required.", 400);

    const substitutions = Array.isArray(body?.substitutions)
      ? body.substitutions as AtsKeywordChange[]
      : [];
    const patchedText = typeof body?.patchedText === "string"
      ? body.patchedText
      : "";
    const sourceFileName = typeof body?.sourceFileName === "string"
      ? body.sourceFileName
      : "resume.pdf";

    const { bytes, fileName } = await downloadResumeBytes(
      supabase,
      userId,
      resumeId,
    );
    const exported = await exportOptimizedResumeBytes({
      fileBytes: bytes,
      fileName: sourceFileName || fileName,
      substitutions,
      patchedText,
    });

    return json({
      base64: bytesToBase64(exported.bytes),
      downloadName: exported.downloadName,
      mimeType: exported.mimeType,
      layoutPreserved: exported.layoutPreserved,
      typographyPreserved: exported.typographyPreserved,
      appliedSubstitutionCount: exported.appliedSubstitutionCount,
      requestedSubstitutionCount: exported.requestedSubstitutionCount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not export resume.";
    return error(message, 500);
  }
});
