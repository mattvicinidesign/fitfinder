"use client";

import { createClient } from "@/lib/supabase/client";
import { parseResume } from "@/lib/api";
import { extractResumeTextFromFile } from "@/lib/extract-resume-text";
import { extractPdfRunsFromFile } from "@/lib/extract-resume-pdf-runs";
import {
  cacheResumeFile,
  cacheResumePdfRuns,
  cacheResumePlainText,
} from "@/lib/resume-file-cache";
import {
  cacheResumeText,
  trackResumeParse,
  waitForResumeParse,
} from "@/lib/resume-parse-tracker";
import { saveLatestResumeCache } from "@/lib/latest-resume-cache";

export { waitForResumeParse };

function guessMimeType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".doc")) return "application/msword";
  if (lower.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (lower.endsWith(".txt")) return "text/plain";
  return "application/octet-stream";
}

/** iCloud / Files on iOS can report size 0 until the blob is read. */
export async function ensureReadableResumeFile(file: File): Promise<File> {
  if (file.size > 0) return file;
  const data = await file.arrayBuffer();
  if (data.byteLength === 0) {
    throw new Error(
      "Could not read that file. Save it on your device or try a PDF export.",
    );
  }
  const name = file.name?.trim() || "resume.pdf";
  return new File([data], name, { type: file.type || guessMimeType(name) });
}

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
  const readable = await ensureReadableResumeFile(file);
  if (readable.size > 5 * 1024 * 1024) {
    throw new Error("Resume file must be under 5MB.");
  }
  const lowerCheck = readable.name.toLowerCase();
  if (
    !lowerCheck.endsWith(".pdf") &&
    !lowerCheck.endsWith(".docx") &&
    !lowerCheck.endsWith(".doc") &&
    !lowerCheck.endsWith(".txt") &&
    !lowerCheck.endsWith(".md") &&
    !lowerCheck.endsWith(".markdown")
  ) {
    throw new Error(
      "Unsupported resume format. Upload PDF, Word (.docx), or plain text.",
    );
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to upload a resume.");

  const safeName = readable.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${user.id}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("resumes")
    .upload(path, readable, { upsert: false });
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

  const lowerName = readable.name.toLowerCase();
  let resumeText = "";

  if (lowerName.endsWith(".pdf")) {
    try {
      const extracted = await extractPdfRunsFromFile(readable);
      resumeText = extracted.text;
      await cacheResumeFile(row.id, readable, {
        fileName: readable.name,
        pageCount: extracted.pageCount,
      });
      await cacheResumePdfRuns(row.id, extracted.runs);
    } catch {
      resumeText = await extractTextForParse(readable);
      try {
        await cacheResumeFile(row.id, readable, {
          fileName: readable.name,
          pageCount: 1,
        });
      } catch {
        // File cache is best-effort.
      }
    }
  } else {
    resumeText = await extractTextForParse(readable);
    try {
      await cacheResumeFile(row.id, readable, {
        fileName: readable.name,
        pageCount: 1,
      });
    } catch {
      // File cache is best-effort.
    }
  }

  if (resumeText) {
    cacheResumeText(row.id, resumeText);
    void cacheResumePlainText(row.id, resumeText);
  }

  trackResumeParse(
    row.id,
    parseResume(
      resumeText
        ? { resumeId: row.id, resumeText }
        : { resumeId: row.id },
    ),
  );

  saveLatestResumeCache({
    id: row.id,
    fileName: readable.name,
  });

  return {
    resumeId: row.id,
    fileUrl: publicUrl,
    fileName: readable.name,
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
