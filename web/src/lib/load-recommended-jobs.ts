import { isNativePlatform } from "@/lib/platform";
import { createClient } from "@/lib/supabase/client";
import type { RecommendedJob } from "@/lib/types";
import { BUNDLED_RECOMMENDED_JOBS } from "@/generated/recommended-jobs-bundled";

interface RecommendedJobsResponse {
  jobs?: RecommendedJob[];
  error?: string;
  mode?: string;
}

let cachedRecommendedJobs: RecommendedJob[] | null = null;
let cachedForUserKey: string | null = null;

/** Instant carousel paint on home return — refreshed async in the background. */
export function getCachedRecommendedJobs(): RecommendedJob[] {
  return cachedRecommendedJobs ?? BUNDLED_RECOMMENDED_JOBS;
}

/** Clear in-memory cache (e.g. after auth change). */
export function clearRecommendedJobsCache(): void {
  cachedRecommendedJobs = null;
  cachedForUserKey = null;
}

/** Production web origin for live native refresh (CapacitorHttp external only). */
const DEFAULT_LIVE_ORIGIN = "https://fitfinder.vercel.app";

function parseCapacitorData(data: unknown): unknown {
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as unknown;
    } catch {
      return data;
    }
  }
  return data;
}

function parseJobsPayload(payload: unknown): RecommendedJob[] {
  if (!payload || typeof payload !== "object") return [];
  const data = payload as RecommendedJobsResponse;
  if (data.error?.trim()) throw new Error(data.error);
  return data.jobs ?? [];
}

async function resolveAuthUserKey(): Promise<string> {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return "anon";
    if (user.is_anonymous) return `guest:${user.id}`;
    return `registered:${user.id}`;
  } catch {
    return "anon";
  }
}

async function getAccessToken(): Promise<string | null> {
  try {
    const supabase = createClient();
    await supabase.auth.refreshSession().catch(() => {
      /* best-effort */
    });
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

async function fetchLiveRecommendedJobs(): Promise<RecommendedJob[]> {
  const appOrigin =
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ||
    DEFAULT_LIVE_ORIGIN;
  const url = `${appOrigin}/api/jobs/recommended`;

  const headers: Record<string, string> = {};
  const token = await getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const { CapacitorHttp } = await import("@capacitor/core");
  const response = await CapacitorHttp.get({ url, headers });
  if (response.status < 200 || response.status >= 300) {
    throw new Error("Couldn't load recommended jobs.");
  }
  return parseJobsPayload(parseCapacitorData(response.data));
}

async function fetchWebRecommendedJobs(): Promise<RecommendedJob[]> {
  const res = await fetch("/api/jobs/recommended", {
    credentials: "same-origin",
  });
  const data = (await res.json()) as RecommendedJobsResponse;
  if (!res.ok) {
    throw new Error(data.error ?? "Couldn't load recommended jobs.");
  }
  return parseJobsPayload(data);
}

/**
 * Recommended jobs for Home.
 * Tries live API first; falls back to bundled snapshot (baked at build / cap:sync)
 * when the server key is missing or the route errors.
 */
export async function loadRecommendedJobs(): Promise<RecommendedJob[]> {
  const userKey = await resolveAuthUserKey();
  if (cachedForUserKey !== null && cachedForUserKey !== userKey) {
    clearRecommendedJobsCache();
  }

  if (!isNativePlatform()) {
    try {
      const jobs = await fetchWebRecommendedJobs();
      if (jobs.length > 0) {
        cachedRecommendedJobs = jobs;
        cachedForUserKey = userKey;
        return jobs;
      }
    } catch {
      /* fall back to bundled snapshot */
    }

    if (BUNDLED_RECOMMENDED_JOBS.length > 0) {
      cachedRecommendedJobs = BUNDLED_RECOMMENDED_JOBS;
      cachedForUserKey = userKey;
      return BUNDLED_RECOMMENDED_JOBS;
    }

    throw new Error("Couldn't load recommended jobs.");
  }

  try {
    const live = await fetchLiveRecommendedJobs();
    if (live.length > 0) {
      cachedRecommendedJobs = live;
      cachedForUserKey = userKey;
      return live;
    }
  } catch {
    /* fall back to bundled snapshot */
  }

  if (BUNDLED_RECOMMENDED_JOBS.length > 0) {
    cachedRecommendedJobs = BUNDLED_RECOMMENDED_JOBS;
    cachedForUserKey = userKey;
    return BUNDLED_RECOMMENDED_JOBS;
  }

  throw new Error("Couldn't load recommended jobs.");
}
