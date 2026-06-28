import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Standard loading dial for primary CTAs — replaces label text while async work runs. */
export function CtaSpinner({ className }: { className?: string }) {
  return (
    <Loader2 className={cn("size-5 animate-spin", className)} aria-hidden />
  );
}
