import { toast } from "sonner";
import { ATS_NO_KEYWORDS_MESSAGE } from "@/lib/ats-keyword-optimization-core";

export function showAtsOptimizeError(error: unknown): void {
  const message =
    error instanceof Error
      ? error.message
      : "Could not optimize keywords. Try again.";

  if (message === ATS_NO_KEYWORDS_MESSAGE) {
    toast.info(message);
    return;
  }

  toast.error(message);
}
