import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Vercel still routes on middleware.ts; Next.js 16 also accepts proxy.ts locally.
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
