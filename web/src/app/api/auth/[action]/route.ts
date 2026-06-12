import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_APP_ROUTE } from "@/lib/app-session";

/** Satisfies static export (Capacitor); handler is not served from the iOS bundle. */
export function generateStaticParams() {
  return [{ action: "callback" }];
}

/**
 * Web-only magic-link handler. Exchanges PKCE codes (or token_hash OTP) on the
 * server so the code verifier is read from auth cookies set during signInWithOtp.
 * Native iOS uses the client /auth/callback page instead — do not call this route
 * from Capacitor.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ action: string }> },
) {
  const { action } = await context.params;
  if (action !== "callback") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const next = requestUrl.searchParams.get("next") ?? DEFAULT_APP_ROUTE;

  const finishUrl = new URL("/auth/callback", requestUrl.origin);
  finishUrl.searchParams.set("next", next);

  if (!code && !(tokenHash && type)) {
    finishUrl.searchParams.set(
      "error",
      "Missing sign-in credentials. Try again from the login screen.",
    );
    return NextResponse.redirect(finishUrl);
  }

  const supabase = await createClient();

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({
        token_hash: tokenHash!,
        type: type!,
      });

  if (error) {
    finishUrl.searchParams.set("error", error.message);
  }

  return NextResponse.redirect(finishUrl);
}
