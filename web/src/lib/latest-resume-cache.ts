import type { ResumeDocument } from "@/lib/resume-documents";

export const LATEST_RESUME_CACHE_KEY = "fitfinder-latest-resume";

function canUseCache(): boolean {
  return typeof localStorage !== "undefined";
}

/** Sync read for Analyze / Score — avoids an empty resume flash while Supabase loads. */
export function loadLatestResumeCache(): ResumeDocument | null {
  if (!canUseCache()) return null;

  const raw = localStorage.getItem(LATEST_RESUME_CACHE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<ResumeDocument>;
    if (
      typeof parsed.id !== "string" ||
      !parsed.id.trim() ||
      typeof parsed.fileName !== "string" ||
      !parsed.fileName.trim()
    ) {
      return null;
    }
    return {
      id: parsed.id.trim(),
      fileName: parsed.fileName.trim(),
      uploadedAt:
        typeof parsed.uploadedAt === "string" && parsed.uploadedAt.trim()
          ? parsed.uploadedAt.trim()
          : "",
    };
  } catch {
    return null;
  }
}

export function saveLatestResumeCache(
  resume: Pick<ResumeDocument, "id" | "fileName"> &
    Partial<Pick<ResumeDocument, "uploadedAt">>,
): void {
  if (!canUseCache()) return;
  const id = resume.id.trim();
  const fileName = resume.fileName.trim();
  if (!id || !fileName) return;

  const payload: ResumeDocument = {
    id,
    fileName,
    uploadedAt: resume.uploadedAt?.trim() || new Date().toISOString(),
  };
  localStorage.setItem(LATEST_RESUME_CACHE_KEY, JSON.stringify(payload));
}

export function clearLatestResumeCache(): void {
  if (!canUseCache()) return;
  localStorage.removeItem(LATEST_RESUME_CACHE_KEY);
}
