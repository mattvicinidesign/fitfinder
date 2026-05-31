"use client";

import { createClient } from "@/lib/supabase/client";
import { parseResume } from "@/lib/api";
import {
  trackResumeParse,
  waitForResumeParse,
} from "@/lib/resume-parse-tracker";

export { waitForResumeParse };

/**
 * Upload resume to Storage and create a DB row. Returns quickly; parsing runs
 * in the background so the user can keep filling the form.
 */
export async function uploadResume(file: File): Promise<{
  resumeId: string;
  fileUrl: string;
  fileName: string;
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

  const { data: row, error: insertError } = await supabase
    .from("resumes")
    .insert({ user_id: user.id, file_url: path })
    .select("id")
    .single();
  if (insertError) throw new Error(insertError.message);

  // Parse on the server from Storage — client PDF/DOCX extraction can hang in Next.js.
  trackResumeParse(row.id, parseResume({ resumeId: row.id }));

  return {
    resumeId: row.id,
    fileUrl: publicUrl,
    fileName: file.name,
  };
}

/** @deprecated Use uploadResume — kept for any external callers. */
export async function uploadAndParseResume(file: File): Promise<{
  resumeId: string;
  fileUrl: string;
}> {
  const uploaded = await uploadResume(file);
  await waitForResumeParse(uploaded.resumeId);
  return { resumeId: uploaded.resumeId, fileUrl: uploaded.fileUrl };
}
