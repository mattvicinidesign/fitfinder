import { createClient } from "@/lib/supabase/client";

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

  return (data ?? []).map((row) => ({
    id: row.id,
    fileName: fileNameFromStoragePath(row.file_url ?? "Document"),
    uploadedAt: row.uploaded_at,
  }));
}
