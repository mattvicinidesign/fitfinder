"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EMAIL_OTP_RESEND_COOLDOWN_SECONDS } from "@/lib/email-otp";

export function useResendCooldown(
  seconds = EMAIL_OTP_RESEND_COOLDOWN_SECONDS,
): {
  remaining: number;
  active: boolean;
  start: () => void;
} {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (remaining <= 0) return;
    const id = window.setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => window.clearTimeout(id);
  }, [remaining]);

  const start = useCallback(() => {
    setRemaining(seconds);
  }, [seconds]);

  return useMemo(
    () => ({ remaining, active: remaining > 0, start }),
    [remaining, start],
  );
}
