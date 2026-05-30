"use client";

import { createClient } from "@/lib/supabase/client";
import { parseResume } from "@/lib/api";

const TEXT_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "application/json",
]);

const TEXT_EXTENSIONS = /\.(txt|md|markdown|json|csv)$/i;

/** Read plain-text content from a user-selected file when possible. */
export async function readResumeTextFromFile(file: File): Promise<string> {
  if (TEXT_TYPES.has(file.type) || TEXT_EXTENSIONS.test(file.name)) {
    return file.text();
  }
  // PDF/DOC: no client parser in MVP — caller should prompt to paste after upload.
  return "";
}

/**
 * Upload resume to Supabase Storage (private `resumes` bucket, user folder),
 * parse via the shared Edge Function, and return resume id + parsed JSON.
 */
export async function uploadAndParseResume(file: File): Promise<{
  resumeId: string;
  resumeText: string;
  fileUrl: string;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to upload a resume.");

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${user.id}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("resumes")
    .upload(path, file, { upsert: false });
  if (uploadError) throw new Error(uploadError.message);

  const {
    data: { publicUrl },
  } = supabase.storage.from("resumes").getPublicUrl(path);
  // Bucket is private; store the storage path as the canonical reference.
  const fileRef = path;

  let resumeText = await readResumeTextFromFile(file);
  if (!resumeText.trim()) {
    throw new Error(
      "Could not read text from this file. Paste your resume as text, or upload a .txt / .md file.",
    );
  }

  const { data: row, error: insertError } = await supabase
    .from("resumes")
    .insert({ user_id: user.id, file_url: fileRef })
    .select("id")
    .single();
  if (insertError) throw new Error(insertError.message);

  const { parsedResume } = await parseResume(resumeText, row.id);

  return {
    resumeId: row.id,
    resumeText,
    fileUrl: publicUrl,
  };
}
