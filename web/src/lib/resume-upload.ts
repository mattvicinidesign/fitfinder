"use client";

import { createClient } from "@/lib/supabase/client";
import { parseResume } from "@/lib/api";
import { extractResumeTextFromFile } from "@/lib/extract-resume-text";
import { extractPdfRunsFromFile } from "@/lib/extract-resume-pdf-runs";
import {
  cacheResumeFile,
  cacheResumePdfRuns,
} from "@/lib/resume-file-cache";
import {
  cacheResumeText,
  trackResumeParse,
  waitForResumeParse,
} from "@/lib/resume-parse-tracker";

export { waitForResumeParse };

async function extractTextForParse(file: File): Promise<string> {
  try {
    return (await extractResumeTextFromFile(file)).trim();
  } catch {
    return "";
  }
}

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

  const resumeText = await extractTextForParse(file);
  if (resumeText) {
    cacheResumeText(row.id, resumeText);
  }

  try {
    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith(".pdf")) {
      const extracted = await extractPdfRunsFromFile(file);
      await cacheResumeFile(row.id, file, {
        fileName: file.name,
        pageCount: extracted.pageCount,
      });
      await cacheResumePdfRuns(row.id, extracted.runs);
    } else {
      await cacheResumeFile(row.id, file, {
        fileName: file.name,
        pageCount: 1,
      });
    }
  } catch {
    // File cache is best-effort; download can fall back to Supabase Storage.
  }

  trackResumeParse(
    row.id,
    parseResume(
      resumeText
        ? { resumeId: row.id, resumeText }
        : { resumeId: row.id },
    ),
  );

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
