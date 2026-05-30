"use client";

import { createClient } from "@/lib/supabase/client";
import { parseResume } from "@/lib/api";

const TEXT_TYPES = new Set(["text/plain"]);
const TEXT_EXTENSIONS = /\.(txt)$/i;

/** Read plain-text content from a user-selected file when possible. */
export async function readResumeTextFromFile(file: File): Promise<string> {
  if (TEXT_TYPES.has(file.type) || TEXT_EXTENSIONS.test(file.name)) {
    return file.text();
  }
  return "";
}

/**
 * Upload resume to Supabase Storage (private `resumes` bucket, user folder),
 * parse via the shared Edge Function, and return resume id.
 */
export async function uploadAndParseResume(file: File): Promise<{
  resumeId: string;
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
  const fileRef = path;

  const { data: row, error: insertError } = await supabase
    .from("resumes")
    .insert({ user_id: user.id, file_url: fileRef })
    .select("id")
    .single();
  if (insertError) throw new Error(insertError.message);

  const resumeText = await readResumeTextFromFile(file);
  if (resumeText.trim()) {
    await parseResume({ resumeText, resumeId: row.id });
  } else {
    await parseResume({ resumeId: row.id });
  }

  return {
    resumeId: row.id,
    fileUrl: publicUrl,
  };
}
