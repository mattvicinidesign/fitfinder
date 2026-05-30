import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED = new Set(["analyze", "parse-resume", "parse-job"]);

const ANALYZE_TIMEOUT_MS = 120_000;
const DEFAULT_TIMEOUT_MS = 90_000;

/**
 * Proxies Edge Function calls through Next.js so the browser never hits
 * cross-origin CORS on Supabase (which surfaces as "Failed to send request").
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ name: string }> },
) {
  const { name } = await context.params;
  if (!ALLOWED.has(name)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json(
      { error: "Server missing Supabase configuration" },
      { status: 500 },
    );
  }

  const body = await request.text();
  const timeoutMs = name === "analyze" ? ANALYZE_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;

  let upstream: Response;
  try {
    upstream = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: anonKey,
        "Content-Type": "application/json",
      },
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    const message =
      e instanceof Error && e.name === "TimeoutError"
        ? "Analysis timed out. Shorten the job description and try again."
        : "Could not reach the analysis service.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const text = await upstream.text();
  let clientStatus = upstream.status;
  let clientBody = text;

  if (upstream.status === 503 || upstream.status === 546) {
    try {
      const boot = JSON.parse(text) as { message?: string; code?: string };
      if (boot.message) {
        clientBody = JSON.stringify({
          error:
            boot.code === "BOOT_ERROR"
              ? `Analysis service failed to start: ${boot.message}`
              : boot.message,
        });
        clientStatus = 503;
      }
    } catch {
      /* use raw text */
    }
  }

  return new NextResponse(clientBody, {
    status: clientStatus,
    headers: {
      "Content-Type":
        upstream.headers.get("Content-Type") ?? "application/json",
    },
  });
}
