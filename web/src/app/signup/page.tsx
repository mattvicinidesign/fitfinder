"use client";

import { useEffect } from "react";
import { requestSignupFlow, SIGNUP_PATH } from "@/lib/app-session";
import { navigateApp } from "@/lib/navigate-app";

/** Legacy /signup URLs — signup lives in the launch overlay on `/`. */
export default function SignUpRedirectPage() {
  useEffect(() => {
    requestSignupFlow();
    navigateApp(SIGNUP_PATH);
  }, []);

  return null;
}
