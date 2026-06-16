import { APP_OVERLAY_ROOT_ID } from "@/lib/overlay-portal";

/**
 * Canonical Fit Finder viewport — identical on iPhone, iPad, desktop, and Capacitor.
 * Desktop is a centered ~480px column; only the outer letterbox differs.
 */
export function AppFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh justify-center overflow-hidden bg-[var(--ios-chrome-bg)]">
      <div
        id={APP_OVERLAY_ROOT_ID}
        className="relative flex h-full w-full max-w-[480px] flex-col overflow-hidden bg-background shadow-[0_0_0_1px_var(--border)]"
      >
        {children}
      </div>
    </div>
  );
}
