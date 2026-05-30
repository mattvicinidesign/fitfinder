import { createClient } from "@/lib/supabase/client";
import { PROFILE_QUALIFIED_INDUSTRY_LABELS } from "@/lib/qualified-industries";
import { uploadAndParseResume } from "@/lib/resume-upload";
import type { Compensation } from "@/lib/types";

/** Simulated onboarding compensation (QA only until onboarding ships). */
export const QA_ONBOARDING_DESIRED_COMPENSATION: Compensation = {
  min: 35,
  max: 60,
  currency: "USD",
  period: "hour",
};

/** Local QA: treat session as registered for full 10-category scoring. */
export function isQaRegisteredScoring(): boolean {
  return process.env.NEXT_PUBLIC_QA_REGISTERED_SCORING === "true";
}

/** Static asset served from web/public/qa (dev QA only). */
export const QA_PRELOAD_RESUME_URL =
  "/qa/Matt_Vicini_Product_Designer_Resume_2026C.pdf";
export const QA_PRELOAD_RESUME_NAME =
  "Matt_Vicini_Product_Designer_Resume_2026C.pdf";

/** Matches the sanitized filename used in Storage paths on upload. */
export const QA_RESUME_FILE_MARKER =
  "Matt_Vicini_Product_Designer_Resume_2026C.pdf";

const CACHE_KEY = "ff-qa-resume-cache-v2";

/** Bump when resume parse/normalization changes so QA auto-refreshes once. */
export const QA_RESUME_PARSE_VERSION = 4;

export interface PreloadQaResumeOptions {
  /** Skip cache + DB reuse; upload fixture PDF and parse again. */
  forceRefresh?: boolean;
}

interface QaResumeCache {
  userId: string;
  resumeId: string;
  fileName: string;
  parseVersion: number;
}

function readCache(): QaResumeCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QaResumeCache;
    if (
      parsed.userId &&
      parsed.resumeId &&
      parsed.fileName &&
      parsed.parseVersion === QA_RESUME_PARSE_VERSION
    ) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writeCache(cache: Omit<QaResumeCache, "parseVersion">): void {
  localStorage.setItem(
    CACHE_KEY,
    JSON.stringify({ ...cache, parseVersion: QA_RESUME_PARSE_VERSION }),
  );
}

/** Clears local QA resume cache (next preload will resolve from DB or re-upload). */
export function clearQaResumeCache(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CACHE_KEY);
}

function needsParseRefresh(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return true;
    const parsed = JSON.parse(raw) as QaResumeCache;
    return parsed.parseVersion !== QA_RESUME_PARSE_VERSION;
  } catch {
    return true;
  }
}

/** Instant restore for Analyze UI (local cache only; validated async). */
export function getQaPreloadedResumeLocal(): {
  resumeId: string;
  fileName: string;
} | null {
  if (!isQaRegisteredScoring()) return null;
  const cache = readCache();
  if (!cache) return null;
  return { resumeId: cache.resumeId, fileName: cache.fileName };
}

async function validateParsedResume(
  userId: string,
  resumeId: string,
): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("resumes")
    .select("id")
    .eq("id", resumeId)
    .eq("user_id", userId)
    .not("parsed_resume_json", "is", null)
    .maybeSingle();
  return !error && !!data;
}

/** Reuse a prior QA upload for this user (skips Storage + OpenAI parse). */
async function findExistingQaResume(userId: string): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("resumes")
    .select("id")
    .eq("user_id", userId)
    .like("file_url", `%${QA_RESUME_FILE_MARKER}%`)
    .not("parsed_resume_json", "is", null)
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data.id;
}

let preloadInFlight: Promise<{
  resumeId: string;
  fileName: string;
} | null> | null = null;

/**
 * Resolves a ready-to-analyze QA resume id (cached, DB reuse, or upload+parse).
 * Safe to call multiple times; concurrent calls share one in-flight request.
 */
async function uploadQaFixtureResume(): Promise<{
  resumeId: string;
  fileName: string;
}> {
  const [res] = await Promise.all([
    fetch(QA_PRELOAD_RESUME_URL),
    ensureQaRegisteredAccount(),
  ]);

  if (!res.ok) {
    throw new Error(
      `QA resume fixture missing (${res.status}). Expected ${QA_PRELOAD_RESUME_URL} in web/public/qa/.`,
    );
  }

  const blob = await res.blob();
  const file = new File([blob], QA_PRELOAD_RESUME_NAME, {
    type: "application/pdf",
  });
  const { resumeId } = await uploadAndParseResume(file);
  return { resumeId, fileName: QA_PRELOAD_RESUME_NAME };
}

export async function preloadQaResume(
  options: PreloadQaResumeOptions = {},
): Promise<{
  resumeId: string;
  fileName: string;
} | null> {
  if (!isQaRegisteredScoring()) return null;

  const forceRefresh = options.forceRefresh ?? needsParseRefresh();

  if (forceRefresh) {
    preloadInFlight = null;
  } else if (preloadInFlight) {
    return preloadInFlight;
  }

  preloadInFlight = (async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const fileName = QA_PRELOAD_RESUME_NAME;

    if (forceRefresh) {
      clearQaResumeCache();
    } else {
      const cached = readCache();
      if (cached?.userId === user.id) {
        if (await validateParsedResume(user.id, cached.resumeId)) {
          return { resumeId: cached.resumeId, fileName: cached.fileName };
        }
      }

      const existingId = await findExistingQaResume(user.id);
      if (existingId) {
        writeCache({ userId: user.id, resumeId: existingId, fileName });
        return { resumeId: existingId, fileName };
      }
    }

    const uploaded = await uploadQaFixtureResume();
    writeCache({
      userId: user.id,
      resumeId: uploaded.resumeId,
      fileName: uploaded.fileName,
    });
    return uploaded;
  })();

  try {
    return await preloadInFlight;
  } finally {
    preloadInFlight = null;
  }
}

/**
 * Re-upload the QA fixture PDF, re-parse, and refresh local cache.
 */
export async function refreshQaResume(): Promise<{
  resumeId: string;
  fileName: string;
} | null> {
  clearQaResumeCache();
  return preloadQaResume({ forceRefresh: true });
}

/**
 * Start QA resume resolution as soon as the user is signed in (before Analyze).
 * Auto re-uploads when parse version changes (e.g. industry normalization).
 */
export function warmQaResumePreload(): void {
  if (!isQaRegisteredScoring()) return;
  void ensureQaRegisteredAccount();
  void ensureProfileQualifications();
  void preloadQaResume();
}

/**
 * Seeds profile qualifications for scoring (industries only; skills = resume only).
 * Clears any previously seeded qualified_skills. Dev/QA only.
 */
export async function ensureProfileQualifications(): Promise<void> {
  if (!isQaRegisteredScoring()) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from("profiles").upsert({
    user_id: user.id,
    qualified_industries: [...PROFILE_QUALIFIED_INDUSTRY_LABELS],
    qualified_skills: [],
    desired_compensation_min: QA_ONBOARDING_DESIRED_COMPENSATION.min,
    desired_compensation_max: QA_ONBOARDING_DESIRED_COMPENSATION.max,
    desired_compensation_currency: QA_ONBOARDING_DESIRED_COMPENSATION.currency,
    desired_compensation_period: QA_ONBOARDING_DESIRED_COMPENSATION.period,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.warn("[QA] Could not set profile qualifications:", error.message);
  }
}

/** @deprecated Use ensureProfileQualifications */
export const ensureProfileQualifiedIndustries = ensureProfileQualifications;

/**
 * Sets public.users.account_type to registered for the current JWT.
 * Analyze reads this for guest vs registered weights. Dev/QA only.
 */
export async function ensureQaRegisteredAccount(): Promise<void> {
  if (!isQaRegisteredScoring()) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("users")
    .update({ account_type: "registered" })
    .eq("id", user.id);

  if (error) {
    console.warn("[QA] Could not set account_type to registered:", error.message);
  }
}
