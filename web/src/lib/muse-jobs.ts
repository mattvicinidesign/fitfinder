import type { RecommendedJob } from "@/lib/types";

export const MUSE_JOBS_URL = "https://www.themuse.com/api/public/jobs";
export const MUSE_COMPANIES_URL = "https://www.themuse.com/api/public/companies";

/** Muse category that surfaces design / UX listings on page 0. */
export const MUSE_DESIGN_CATEGORY = "Design and UX";

export const PRODUCT_DESIGN_KEYWORDS = [
  "Product Designer",
  "Senior Product Designer",
  "Lead Product Designer",
  "Staff Product Designer",
  "Principal Product Designer",
  "UX Designer",
  "UX/UI Designer",
  "Product Design",
  "User Experience",
] as const;

export interface MuseJobLocation {
  name?: string;
}

export interface MuseJobLevel {
  name?: string;
  short_name?: string;
}

export interface MuseJobCompany {
  id?: number;
  name?: string;
  short_name?: string;
}

export interface MuseJobRaw {
  id: number;
  name: string;
  publication_date?: string;
  locations?: MuseJobLocation[];
  levels?: MuseJobLevel[];
  company?: MuseJobCompany;
  refs?: {
    landing_page?: string;
  };
}

export interface MuseJobsResponse {
  page?: number;
  results?: MuseJobRaw[];
}

interface MuseCompanyResponse {
  id?: number;
  refs?: {
    logo_image?: string;
  };
}

export function getMuseApiKey(): string | null {
  return process.env.MUSE_API_KEY?.trim() ?? null;
}

export function scoreProductDesignTitle(title: string): number {
  const lower = title.toLowerCase();
  let best = 0;
  for (let i = 0; i < PRODUCT_DESIGN_KEYWORDS.length; i++) {
    const keyword = PRODUCT_DESIGN_KEYWORDS[i].toLowerCase();
    if (lower.includes(keyword)) {
      best = Math.max(best, PRODUCT_DESIGN_KEYWORDS.length - i);
    }
  }
  return best;
}

/** Sort keyword matches first (highest score), then by publication date. */
export function prioritizeProductDesignJobs(jobs: MuseJobRaw[]): MuseJobRaw[] {
  return [...jobs].sort((a, b) => {
    const scoreDiff =
      scoreProductDesignTitle(b.name) - scoreProductDesignTitle(a.name);
    if (scoreDiff !== 0) return scoreDiff;
    const bTime = Date.parse(b.publication_date ?? "") || 0;
    const aTime = Date.parse(a.publication_date ?? "") || 0;
    return bTime - aTime;
  });
}

export function transformMuseJob(job: MuseJobRaw): RecommendedJob | null {
  const applyUrl = job.refs?.landing_page?.trim();
  if (!applyUrl) return null;

  const location =
    job.locations
      ?.map((entry) => entry.name?.trim())
      .filter(Boolean)
      .join(", ") || "Location not listed";

  const level =
    job.levels
      ?.map((entry) => entry.name?.trim())
      .filter(Boolean)
      .join(", ") || "Level not listed";

  return {
    id: String(job.id),
    title: job.name.trim(),
    company: job.company?.name?.trim() || "Company not listed",
    location,
    level,
    publishedAt: job.publication_date ?? "",
    applyUrl,
    logoUrl: null,
  };
}

const RECOMMENDED_JOBS_LIMIT = 20;
const RECOMMENDED_JOBS_MAX_PAGES = 5;

/** Muse often returns expired listings — skip URLs that 404 on themuse.com. */
export async function isLiveMuseJobListing(applyUrl: string): Promise<boolean> {
  try {
    const response = await fetch(applyUrl, {
      method: "HEAD",
      redirect: "follow",
      next: { revalidate: 300 },
    });
    return response.status >= 200 && response.status < 400;
  } catch {
    return false;
  }
}

async function filterLiveRecommendedJobs(
  jobs: RecommendedJob[],
): Promise<RecommendedJob[]> {
  const results = await Promise.all(
    jobs.map(async (job) => ({
      job,
      live: await isLiveMuseJobListing(job.applyUrl),
    })),
  );
  return results.filter(({ live }) => live).map(({ job }) => job);
}

export async function fetchMuseJobsPage(
  page: number,
  opts?: { category?: string },
): Promise<MuseJobsResponse> {
  const apiKey = getMuseApiKey();
  if (!apiKey) {
    throw new Error("MUSE_API_KEY is not configured on the server.");
  }

  const params = new URLSearchParams({
    page: String(page),
    api_key: apiKey,
  });
  if (opts?.category?.trim()) {
    params.set("category", opts.category.trim());
  }

  const url = `${MUSE_JOBS_URL}?${params.toString()}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reach The Muse API.";
    throw new Error(message);
  }

  if (!response.ok) {
    throw new Error(`The Muse API request failed (${response.status}).`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("The Muse API returned a non-JSON response.");
  }

  return payload as MuseJobsResponse;
}

async function fetchMuseCompanyLogo(companyId: number): Promise<string | null> {
  const apiKey = getMuseApiKey();
  if (!apiKey) return null;

  const url = `${MUSE_COMPANIES_URL}/${companyId}?api_key=${encodeURIComponent(apiKey)}`;

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86_400 },
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as MuseCompanyResponse;
    return payload.refs?.logo_image?.trim() ?? null;
  } catch {
    return null;
  }
}

async function loadCompanyLogos(
  companyIds: number[],
): Promise<Map<number, string | null>> {
  const unique = [...new Set(companyIds)];
  const entries = await Promise.all(
    unique.map(
      async (id) => [id, await fetchMuseCompanyLogo(id)] as const,
    ),
  );
  return new Map(entries);
}

export async function loadRecommendedMuseJobs(): Promise<RecommendedJob[]> {
  const collected: RecommendedJob[] = [];
  let page = 0;

  while (collected.length < RECOMMENDED_JOBS_LIMIT && page < RECOMMENDED_JOBS_MAX_PAGES) {
    const payload = await fetchMuseJobsPage(page, {
      category: MUSE_DESIGN_CATEGORY,
    });
    const raw = Array.isArray(payload.results) ? payload.results : [];
    if (!raw.length) break;

    const prioritized = prioritizeProductDesignJobs(raw);
    const companyIds = [
      ...new Set(
        prioritized
          .map((job) => job.company?.id)
          .filter((id): id is number => typeof id === "number"),
      ),
    ];
    const logosByCompanyId = await loadCompanyLogos(companyIds);

    const candidates = prioritized
      .map((job) => {
        const transformed = transformMuseJob(job);
        if (!transformed) return null;
        const companyId = job.company?.id;
        return {
          ...transformed,
          logoUrl:
            companyId != null ? logosByCompanyId.get(companyId) ?? null : null,
        };
      })
      .filter((job): job is RecommendedJob => job != null);

    const live = await filterLiveRecommendedJobs(candidates);
    for (const job of live) {
      if (collected.length >= RECOMMENDED_JOBS_LIMIT) break;
      if (!collected.some((existing) => existing.id === job.id)) {
        collected.push(job);
      }
    }

    page++;
  }

  return collected;
}
