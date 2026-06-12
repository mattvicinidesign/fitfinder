"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy path — works on web and Capacitor static export. */
export default function DashboardRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/saved");
  }, [router]);

  return null;
}
