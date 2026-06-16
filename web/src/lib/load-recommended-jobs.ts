import { isNativePlatform } from "@/lib/platform";
import type { RecommendedJob } from "@/lib/types";
import { BUNDLED_RECOMMENDED_JOBS } from "@/generated/recommended-jobs-bundled";

interface RecommendedJobsResponse {
  jobs?: RecommendedJob[];
  error?: string;
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
 * Web: live API route. Native: bundled at cap:sync (CapacitorHttp breaks local
 * asset fetch); optional live refresh from production Vercel via CapacitorHttp.
 */
export async function loadRecommendedJobs(): Promise<RecommendedJob[]> {
  if (!isNativePlatform()) {
    return fetchWebRecommendedJobs();
  }

  try {
    const live = await fetchLiveRecommendedJobs();
    if (live.length > 0) return live;
  } catch {
    /* fall back to bundled snapshot */
  }

  if (BUNDLED_RECOMMENDED_JOBS.length > 0) {
    return BUNDLED_RECOMMENDED_JOBS;
  }

  throw new Error("Couldn't load recommended jobs.");
}
