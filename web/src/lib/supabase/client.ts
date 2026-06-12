"use client";

import { createBrowserClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { isNativePlatform } from "@/lib/platform";

let nativeClient: SupabaseClient | undefined;

/** Supabase client for use in Client Components. */
export function createClient(): SupabaseClient {
  if (typeof window !== "undefined" && isNativePlatform()) {
    nativeClient ??= createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storage: localStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      },
    );
    return nativeClient;
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Exchanged explicitly in /auth/callback (web route + native client).
        detectSessionInUrl: false,
      },
    },
  );
}
