/**
 * Pre-build step for Capacitor: fetch Muse jobs and bake into the JS bundle.
 * CapacitorHttp patches fetch globally, so native cannot load local JSON files.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");
const envPath = path.join(webRoot, ".env.local");
const outPath = path.join(
  webRoot,
  "src/generated/recommended-jobs-bundled.ts",
);

const MUSE_JOBS_URL = "https://www.themuse.com/api/public/jobs";
const MUSE_COMPANIES_URL = "https://www.themuse.com/api/public/companies";
const MUSE_DESIGN_CATEGORY = "Design and UX";

const PRODUCT_DESIGN_KEYWORDS = [
  "Product Designer",
  "Senior Product Designer",
  "Lead Product Designer",
  "Staff Product Designer",
  "Principal Product Designer",
  "UX Designer",
  "UX/UI Designer",
  "Product Design",
  "User Experience",
];

function loadEnvLocal() {
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function scoreProductDesignTitle(title) {
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

function prioritizeProductDesignJobs(jobs) {
  return [...jobs].sort((a, b) => {
    const scoreDiff =
      scoreProductDesignTitle(b.name) - scoreProductDesignTitle(a.name);
    if (scoreDiff !== 0) return scoreDiff;
    const bTime = Date.parse(b.publication_date ?? "") || 0;
    const aTime = Date.parse(a.publication_date ?? "") || 0;
    return bTime - aTime;
  });
}

function transformMuseJob(job) {
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

async function fetchMuseCompanyLogo(apiKey, companyId) {
  const url = `${MUSE_COMPANIES_URL}/${companyId}?api_key=${encodeURIComponent(apiKey)}`;
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    const payload = await response.json();
    return payload.refs?.logo_image?.trim() ?? null;
  } catch {
    return null;
  }
}

async function isLiveMuseJobListing(applyUrl) {
  try {
    const response = await fetch(applyUrl, {
      method: "HEAD",
      redirect: "follow",
    });
    return response.status >= 200 && response.status < 400;
  } catch {
    return false;
  }
}

async function filterLiveRecommendedJobs(jobs) {
  const results = await Promise.all(
    jobs.map(async (job) => ({
      job,
      live: await isLiveMuseJobListing(job.applyUrl),
    })),
  );
  return results.filter(({ live }) => live).map(({ job }) => job);
}

async function loadRecommendedMuseJobs(apiKey) {
  const collected = [];
  const limit = 20;
  const maxPages = 5;

  for (let page = 0; page < maxPages && collected.length < limit; page++) {
    const params = new URLSearchParams({
      page: String(page),
      api_key: apiKey,
      category: MUSE_DESIGN_CATEGORY,
    });
    const response = await fetch(`${MUSE_JOBS_URL}?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`The Muse API request failed (${response.status}).`);
    }
    const payload = await response.json();
    const raw = Array.isArray(payload.results) ? payload.results : [];
    if (!raw.length) break;

    const prioritized = prioritizeProductDesignJobs(raw);
    const companyIds = [
      ...new Set(
        prioritized
          .map((job) => job.company?.id)
          .filter((id) => typeof id === "number"),
      ),
    ];
    const logos = new Map(
      await Promise.all(
        companyIds.map(async (id) => [id, await fetchMuseCompanyLogo(apiKey, id)]),
      ),
    );

    const candidates = prioritized
      .map((job) => {
        const transformed = transformMuseJob(job);
        if (!transformed) return null;
        const companyId = job.company?.id;
        return {
          ...transformed,
          logoUrl:
            companyId != null ? logos.get(companyId) ?? null : null,
        };
      })
      .filter(Boolean);

    const live = await filterLiveRecommendedJobs(candidates);
    for (const job of live) {
      if (collected.length >= limit) break;
      if (!collected.some((existing) => existing.id === job.id)) {
        collected.push(job);
      }
    }
  }

  return collected;
}

function writeBundledModule(jobs) {
  const body = JSON.stringify(jobs, null, 2);
  const contents = `// Auto-generated by scripts/prepare-recommended-jobs-bundled.mjs — do not edit.
import type { RecommendedJob } from "@/lib/types";

export const BUNDLED_RECOMMENDED_JOBS: RecommendedJob[] = ${body} as RecommendedJob[];
`;
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, contents, "utf8");
}

async function main() {
  loadEnvLocal();
  const apiKey = process.env.MUSE_API_KEY?.trim();
  if (!apiKey) {
    console.warn(
      "[prepare-recommended-jobs-bundled] MUSE_API_KEY missing — keeping empty bundle.",
    );
    writeBundledModule([]);
    return;
  }

  const jobs = await loadRecommendedMuseJobs(apiKey);
  writeBundledModule(jobs);
  console.log(
    `[prepare-recommended-jobs-bundled] Bundled ${jobs.length} jobs for native.`,
  );
}

main().catch((error) => {
  console.error("[prepare-recommended-jobs-bundled]", error);
  writeBundledModule([]);
  process.exit(1);
});
