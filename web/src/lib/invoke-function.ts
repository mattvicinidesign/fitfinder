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

function createTimeoutSignal(timeoutMs: number): AbortSignal {
  if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) {
    return AbortSignal.timeout(timeoutMs);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  controller.signal.addEventListener(
    "abort",
    () => clearTimeout(timer),
    { once: true },
  );
  return controller.signal;
}

function parseResponsePayload(data: unknown): unknown {
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as unknown;
    } catch {
      return data;
    }
  }
  return data;
}

function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.name === "TimeoutError" ||
    error.message.toLowerCase().includes("timeout")
  );
}

function humanizeFunctionError(message: string): string {
  if (/function exited due to an error/i.test(message)) {
    return "Export failed on the server. Try again in a moment.";
  }
  return message;
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

async function postFunctionRequest(
  url: string,
  headers: Record<string, string>,
  body: Record<string, unknown>,
  timeoutMs: number,
): Promise<{ ok: boolean; status: number; payload: unknown }> {
  if (isNativePlatform()) {
    const { CapacitorHttp } = await import("@capacitor/core");
    try {
      const response = await CapacitorHttp.post({
        url,
        headers,
        data: JSON.stringify(body),
        connectTimeout: timeoutMs,
        readTimeout: timeoutMs,
      });
      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        payload: parseResponsePayload(response.data),
      };
    } catch (error) {
      if (isTimeoutError(error)) {
        throw new Error("Request timed out. Try again.");
      }
      throw new Error(
        "Could not reach the server. Check your connection and try again.",
      );
    }
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      credentials: "include",
      signal: createTimeoutSignal(timeoutMs),
    });
  } catch (error) {
    if (isTimeoutError(error)) {
      throw new Error("Request timed out. Try again.");
    }
    throw new Error(
      "Could not reach the server. Check your connection and try again.",
    );
  }

  const payload = (await res.json().catch(() => null)) as unknown;
  return { ok: res.ok, status: res.status, payload };
}

export async function invokeFunction<T>(
  name: string,
  body: Record<string, unknown> = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const headers = await authorizedHeaders();
  const { ok, status, payload } = await postFunctionRequest(
    functionUrl(name),
    headers,
    body,
    timeoutMs,
  );

  if (!ok) {
    const err =
      (payload && typeof payload === "object" && "error" in payload
        ? (payload as { error?: string }).error
        : null) ??
      (payload && typeof payload === "object" && "message" in payload
        ? (payload as { message?: string }).message
        : null) ??
      `HTTP ${status}`;
    if (status === 401) {
      throw new Error("Session expired. Sign in again (guest or email).");
    }
    throw new Error(
      typeof err === "string" && err.trim()
        ? humanizeFunctionError(err)
        : "Request failed",
    );
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid response from the server.");
  }

  return payload as T;
}
