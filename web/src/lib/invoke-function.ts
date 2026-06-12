"use client";

/**
 * Unified Edge Function invoker for web (Next proxy) and native (direct Supabase).
 * All privileged backend calls should go through this module so web, preview, and
 * iOS stay in sync — see `.cursor/rules/platform-parity.mdc`.
 */

import { createClient } from "@/lib/supabase/client";
import { isNativePlatform } from "@/lib/platform";

const DEFAULT_TIMEOUT_MS = 90_000;

export function functionUrl(name: string): string {
  if (isNativePlatform()) {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!base) {
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.");
    }
    return `${base}/functions/v1/${name}`;
  }
  return `/api/functions/${name}`;
}

async function authorizedHeaders(): Promise<Record<string, string>> {
  const supabase = createClient();
  await supabase.auth.refreshSession().catch(() => {
    /* best-effort */
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Sign in required. Use Continue as guest or your email.");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (isNativePlatform()) {
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!anonKey) {
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY.");
    }
    headers.Authorization = `Bearer ${session.access_token}`;
    headers.apikey = anonKey;
  }

  return headers;
}

export async function invokeFunction<T>(
  name: string,
  body: Record<string, unknown> = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const headers = await authorizedHeaders();

  let res: Response;
  try {
    res = await fetch(functionUrl(name), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      credentials: isNativePlatform() ? "omit" : "include",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    if (e instanceof Error && e.name === "TimeoutError") {
      throw new Error("Request timed out. Try again.");
    }
    throw new Error(
      "Could not reach the server. Check your connection and try again.",
    );
  }

  const payload = (await res.json().catch(() => null)) as
    | T
    | { error?: string; message?: string }
    | null;

  if (!res.ok) {
    const err =
      (payload && typeof payload === "object" && "error" in payload
        ? payload.error
        : null) ??
      (payload && typeof payload === "object" && "message" in payload
        ? payload.message
        : null) ??
      res.statusText;
    if (res.status === 401) {
      throw new Error("Session expired. Sign in again (guest or email).");
    }
    throw new Error(
      typeof err === "string" && err.trim() ? err : "Request failed",
    );
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid response from the server.");
  }

  return payload as T;
}
