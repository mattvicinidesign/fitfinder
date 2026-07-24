// Shared payload size / text length guards for Edge Functions.

/** Max job description characters accepted by analyze / parse-job. */
export const MAX_JOB_TEXT_CHARS = 120_000;

/** Max resume text characters accepted inline by AI ops. */
export const MAX_RESUME_TEXT_CHARS = 200_000;

/** Max resume file bytes (PDF/DOCX/TXT) for extraction paths. */
export const MAX_RESUME_FILE_BYTES = 5 * 1024 * 1024;

const ALLOWED_RESUME_EXTENSIONS = new Set([
  ".pdf",
  ".docx",
  ".doc",
  ".txt",
  ".md",
  ".markdown",
]);

export function assertJobTextSize(jobText: string): string | null {
  if (jobText.length > MAX_JOB_TEXT_CHARS) {
    return "Job description is too long. Paste only the role requirements (under ~120k characters).";
  }
  return null;
}

export function assertResumeTextSize(resumeText: string): string | null {
  if (resumeText.length > MAX_RESUME_TEXT_CHARS) {
    return "Resume text is too long. Upload a shorter resume or trim the content.";
  }
  return null;
}

export function assertResumeFileBytes(byteLength: number): string | null {
  if (byteLength > MAX_RESUME_FILE_BYTES) {
    return "Resume file must be under 5MB.";
  }
  return null;
}

export function isAllowedResumeFilename(filename: string): boolean {
  const lower = filename.toLowerCase();
  const dot = lower.lastIndexOf(".");
  if (dot < 0) return false;
  return ALLOWED_RESUME_EXTENSIONS.has(lower.slice(dot));
}

export function assertResumeFilename(filename: string): string | null {
  if (!isAllowedResumeFilename(filename)) {
    return "Unsupported resume format. Upload PDF, Word (.docx), or plain text.";
  }
  return null;
}
