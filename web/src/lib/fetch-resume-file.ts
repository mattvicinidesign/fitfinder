"use client";

import { createClient } from "@/lib/supabase/client";

export async function fetchResumeFileFromStorage(
  resumeId: string,
): Promise<{ blob: Blob; fileName: string } | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: row, error } = await supabase
    .from("resumes")
    .select("file_url")
    .eq("id", resumeId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !row?.file_url) return null;

  const { data: blob, error: downloadError } = await supabase.storage
    .from("resumes")
    .download(row.file_url);

  if (downloadError || !blob) return null;

  const fileName = row.file_url.split("/").pop() ?? "resume.pdf";
  return { blob, fileName };
}
