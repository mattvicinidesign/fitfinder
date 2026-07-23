import { createClient } from "@/lib/supabase/client";
import { saveLatestResumeCache } from "@/lib/latest-resume-cache";

export type ResumeDocument = {
  id: string;
  fileName: string;
  uploadedAt: string;
};

/** Extract the original filename from a storage path (`userId/timestamp-name.ext`). */
export function fileNameFromStoragePath(path: string): string {
  const base = path.split("/").pop() ?? "Document";
  const match = base.match(/^\d+-(.+)$/);
  return match?.[1] ?? base;
}

export async function fetchUserResumeDocuments(): Promise<ResumeDocument[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("resumes")
    .select("id, file_url, uploaded_at")
    .eq("user_id", user.id)
    .order("uploaded_at", { ascending: false });

  const documents = (data ?? []).map((row) => ({
    id: row.id,
    fileName: fileNameFromStoragePath(row.file_url ?? "Document"),
    uploadedAt: row.uploaded_at,
  }));

  if (documents[0]) {
    saveLatestResumeCache(documents[0]);
  }

  return documents;
}

/** Most recently uploaded resume for the signed-in user. */
export async function fetchLatestUserResume(): Promise<ResumeDocument | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("resumes")
    .select("id, file_url, uploaded_at")
    .eq("user_id", user.id)
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  const resume: ResumeDocument = {
    id: data.id,
    fileName: fileNameFromStoragePath(data.file_url ?? "Document"),
    uploadedAt: data.uploaded_at,
  };
  saveLatestResumeCache(resume);
  return resume;
}

/** Warm the latest-resume cache (e.g. on Home) so Analyze can hydrate instantly. */
export function prefetchLatestUserResume(): void {
  void fetchLatestUserResume();
}
