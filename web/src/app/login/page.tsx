"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy path — works on web and Capacitor static export. */
export default function LoginRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/home");
  }, [router]);

  return null;
}
