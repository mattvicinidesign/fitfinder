import type { RecommendedJobSignals } from "@/lib/recommended-job-signals";
import type { RecommendedJob } from "@/lib/types";

export const MUSE_JOBS_URL = "https://www.themuse.com/api/public/jobs";
export const MUSE_COMPANIES_URL = "https://www.themuse.com/api/public/companies";

/** Muse category that surfaces design / UX listings on page 0. */
export const MUSE_DESIGN_CATEGORY = "Design and UX";

/** Official Muse job categories (used for diverse / tailored fetches). */
export const MUSE_JOB_CATEGORIES = [
  "Accounting and Finance",
  "Account Management/Customer Success",
  "Administration and Office",
  "Advertising and Marketing",
  "Cleaning and Facilities",
  "Computer and IT",
  "Data and Analytics",
  "Design and UX",
  "Energy Generation and Mining",
  "Entertainment and Travel Services",
  "Farming and Outdoors",
  "Food and Hospitality Services",
  "Human Resources and Recruitment",
  "Installation, Maintenance, and Repairs",
  "Manufacturing and Warehouse",
  "Media, PR, and Communications",
  "Personal Care and Services",
  "Protective Services",
  "Science and Engineering",
  "Software Engineering",
  "Sports, Fitness, and Recreation",
  "Transportation and Logistics",
  "Writing and Editing",
] as const;

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

export function scoreTitleAgainstKeywords(
  title: string,
  keywords: readonly string[],
): number {
  const lower = title.toLowerCase();
  let best = 0;
  for (let i = 0; i < keywords.length; i++) {
    const keyword = keywords[i].toLowerCase().trim();
    if (!keyword) continue;
    if (lower.includes(keyword)) {
      best = Math.max(best, keywords.length - i);
    }
  }
  return best;
}

export function scoreProductDesignTitle(title: string): number {
  return scoreTitleAgainstKeywords(title, PRODUCT_DESIGN_KEYWORDS);
}

/** Sort keyword matches first (highest score), then by publication date. */
export function prioritizeJobsByKeywords(
  jobs: MuseJobRaw[],
  keywords: readonly string[],
): MuseJobRaw[] {
  return [...jobs].sort((a, b) => {
    const scoreDiff =
      scoreTitleAgainstKeywords(b.name, keywords) -
      scoreTitleAgainstKeywords(a.name, keywords);
    if (scoreDiff !== 0) return scoreDiff;
    const bTime = Date.parse(b.publication_date ?? "") || 0;
    const aTime = Date.parse(a.publication_date ?? "") || 0;
    return bTime - aTime;
  });
}

/** Sort keyword matches first (highest score), then by publication date. */
export function prioritizeProductDesignJobs(jobs: MuseJobRaw[]): MuseJobRaw[] {
  return prioritizeJobsByKeywords(jobs, PRODUCT_DESIGN_KEYWORDS);
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
const DIVERSE_CATEGORY_SAMPLE = 4;

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
  opts?: { category?: string; descending?: boolean },
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
  if (opts?.descending) {
    params.set("descending", "true");
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

async function attachLogosAndFilterLive(
  prioritized: MuseJobRaw[],
): Promise<RecommendedJob[]> {
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

  return filterLiveRecommendedJobs(candidates);
}

function pushUniqueJobs(
  collected: RecommendedJob[],
  next: RecommendedJob[],
  limit = RECOMMENDED_JOBS_LIMIT,
): void {
  for (const job of next) {
    if (collected.length >= limit) break;
    if (!collected.some((existing) => existing.id === job.id)) {
      collected.push(job);
    }
  }
}

function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = items[i];
    items[i] = items[j];
    items[j] = tmp;
  }
  return items;
}

function sampleCategories(count: number): string[] {
  const pool = shuffleInPlace([...MUSE_JOB_CATEGORIES]);
  return pool.slice(0, Math.max(1, Math.min(count, pool.length)));
}

/** Guest / default feed — Design and UX, product-design keyword priority. */
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
    const live = await attachLogosAndFilterLive(prioritized);
    pushUniqueJobs(collected, live);
    page++;
  }

  return collected;
}

/** Registered user with parsed resume — category + keyword tailored feed. */
export async function loadTailoredMuseJobs(
  signals: RecommendedJobSignals,
): Promise<RecommendedJob[]> {
  const categories =
    signals.categories.length > 0
      ? signals.categories.slice(0, 3)
      : [MUSE_DESIGN_CATEGORY];
  const keywords =
    signals.keywords.length > 0
      ? signals.keywords
      : [...PRODUCT_DESIGN_KEYWORDS];

  const collected: RecommendedJob[] = [];

  for (const category of categories) {
    if (collected.length >= RECOMMENDED_JOBS_LIMIT) break;

    let page = 0;
    while (
      collected.length < RECOMMENDED_JOBS_LIMIT &&
      page < RECOMMENDED_JOBS_MAX_PAGES
    ) {
      try {
        const payload = await fetchMuseJobsPage(page, {
          category,
          descending: true,
        });
        const raw = Array.isArray(payload.results) ? payload.results : [];
        if (!raw.length) break;

        const prioritized = prioritizeJobsByKeywords(raw, keywords);
        const live = await attachLogosAndFilterLive(prioritized);
        pushUniqueJobs(collected, live);
        page++;
      } catch {
        break;
      }
    }
  }

  // If category mapping yielded nothing live, fall back to design feed.
  if (collected.length === 0) {
    return loadRecommendedMuseJobs();
  }

  return collected
    .sort((a, b) => {
      const scoreDiff =
        scoreTitleAgainstKeywords(b.title, keywords) -
        scoreTitleAgainstKeywords(a.title, keywords);
      if (scoreDiff !== 0) return scoreDiff;
      const bTime = Date.parse(b.publishedAt) || 0;
      const aTime = Date.parse(a.publishedAt) || 0;
      return bTime - aTime;
    })
    .slice(0, RECOMMENDED_JOBS_LIMIT);
}

/** Registered user without resume — recent jobs across random Muse categories. */
export async function loadDiverseRecentMuseJobs(): Promise<RecommendedJob[]> {
  const categories = sampleCategories(DIVERSE_CATEGORY_SAMPLE);
  const perCategory: RecommendedJob[][] = [];

  await Promise.all(
    categories.map(async (category) => {
      try {
        const payload = await fetchMuseJobsPage(0, {
          category,
          descending: true,
        });
        const raw = Array.isArray(payload.results) ? payload.results : [];
        if (!raw.length) {
          perCategory.push([]);
          return;
        }
        // Prefer recent publication order within the category page.
        const byDate = [...raw].sort((a, b) => {
          const bTime = Date.parse(b.publication_date ?? "") || 0;
          const aTime = Date.parse(a.publication_date ?? "") || 0;
          return bTime - aTime;
        });
        const live = await attachLogosAndFilterLive(byDate);
        perCategory.push(live);
      } catch {
        perCategory.push([]);
      }
    }),
  );

  // Round-robin interleave so categories stay mixed.
  const collected: RecommendedJob[] = [];
  const indexes = perCategory.map(() => 0);
  let added = true;
  while (collected.length < RECOMMENDED_JOBS_LIMIT && added) {
    added = false;
    for (let i = 0; i < perCategory.length; i++) {
      const list = perCategory[i];
      while (indexes[i] < list.length) {
        const job = list[indexes[i]++];
        if (collected.some((existing) => existing.id === job.id)) continue;
        collected.push(job);
        added = true;
        break;
      }
      if (collected.length >= RECOMMENDED_JOBS_LIMIT) break;
    }
  }

  if (collected.length === 0) {
    return loadRecommendedMuseJobs();
  }

  return shuffleInPlace(collected).slice(0, RECOMMENDED_JOBS_LIMIT);
}
