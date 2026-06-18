import { isNativePlatform } from "@/lib/platform";
import type { RecommendedJob } from "@/lib/types";
import { BUNDLED_RECOMMENDED_JOBS } from "@/generated/recommended-jobs-bundled";

interface RecommendedJobsResponse {
  jobs?: RecommendedJob[];
  error?: string;
}

let cachedRecommendedJobs: RecommendedJob[] | null = null;

/** Instant carousel paint on home return — refreshed async in the background. */
export function getCachedRecommendedJobs(): RecommendedJob[] {
  return cachedRecommendedJobs ?? BUNDLED_RECOMMENDED_JOBS;
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

async function fetchLiveRecommendedJobs(): Promise<RecommendedJob[]> {
  const appOrigin =
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ||
    DEFAULT_LIVE_ORIGIN;
  const url = `${appOrigin}/api/jobs/recommended`;

  const { CapacitorHttp } = await import("@capacitor/core");
  const response = await CapacitorHttp.get({ url });
  if (response.status < 200 || response.status >= 300) {
    throw new Error("Couldn't load recommended jobs.");
  }
  return parseJobsPayload(parseCapacitorData(response.data));
}

async function fetchWebRecommendedJobs(): Promise<RecommendedJob[]> {
  const res = await fetch("/api/jobs/recommended");
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
  if (!isNativePlatform()) {
    try {
      const jobs = await fetchWebRecommendedJobs();
      if (jobs.length > 0) {
        cachedRecommendedJobs = jobs;
        return jobs;
      }
    } catch {
      /* fall back to bundled snapshot */
    }

    if (BUNDLED_RECOMMENDED_JOBS.length > 0) {
      cachedRecommendedJobs = BUNDLED_RECOMMENDED_JOBS;
      return BUNDLED_RECOMMENDED_JOBS;
    }

    throw new Error("Couldn't load recommended jobs.");
  }

  try {
    const live = await fetchLiveRecommendedJobs();
    if (live.length > 0) {
      cachedRecommendedJobs = live;
      return live;
    }
  } catch {
    /* fall back to bundled snapshot */
  }

  if (BUNDLED_RECOMMENDED_JOBS.length > 0) {
    cachedRecommendedJobs = BUNDLED_RECOMMENDED_JOBS;
    return BUNDLED_RECOMMENDED_JOBS;
  }

  throw new Error("Couldn't load recommended jobs.");
}
