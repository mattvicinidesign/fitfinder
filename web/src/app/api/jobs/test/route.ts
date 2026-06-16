import { NextResponse } from "next/server";

/** Capacitor static export: route stub only — live on Vercel/dev. */
export const dynamic = "force-static";
export const revalidate = 0;

const MUSE_JOBS_URL = "https://www.themuse.com/api/public/jobs";

function countJobs(payload: unknown): number {
  if (!payload || typeof payload !== "object") return 0;
  const row = payload as Record<string, unknown>;
  if (Array.isArray(row.results)) return row.results.length;
  if (Array.isArray(row.jobs)) return row.jobs.length;
  if (Array.isArray(row.data)) return row.data.length;
  return 0;
}

/** Smoke-test The Muse jobs API — verify MUSE_API_KEY and inspect response shape. */
export async function GET() {
  const apiKey = process.env.MUSE_API_KEY?.trim();
  if (!apiKey) {
    console.error("[/api/jobs/test] Missing MUSE_API_KEY");
    return NextResponse.json(
      { error: "MUSE_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  const url = `${MUSE_JOBS_URL}?page=0&api_key=${encodeURIComponent(apiKey)}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reach The Muse API.";
    console.error("[/api/jobs/test] Fetch failed:", message);
    return NextResponse.json(
      { error: "Could not reach The Muse API.", detail: message },
      { status: 502 },
    );
  }

  const status = response.status;
  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    console.error("[/api/jobs/test] Invalid JSON", { status });
    return NextResponse.json(
      { error: "The Muse API returned a non-JSON response.", status },
      { status: 502 },
    );
  }

  const jobCount = countJobs(payload);
  console.log("[/api/jobs/test]", { status, jobCount });

  if (!response.ok) {
    return NextResponse.json(
      {
        error: "The Muse API request failed.",
        status,
        body: payload,
      },
      { status },
    );
  }

  return NextResponse.json(payload);
}
