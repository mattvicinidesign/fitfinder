import { cn } from "@/lib/utils";

/** Full-screen overlay matching AppFrame phone canvas + grey letterbox. */
export function LaunchOverlayFrame({
  children,
  className,
  exiting = false,
  "aria-hidden": ariaHidden,
}: {
  children?: React.ReactNode;
  className?: string;
  exiting?: boolean;
  "aria-hidden"?: boolean;
}) {
  return (
    <div
      aria-hidden={ariaHidden}
      className="fixed inset-0 z-[100] flex justify-center bg-[var(--ios-chrome-bg)]"
    >
      <div className="relative flex h-full w-full max-w-[480px] flex-col overflow-hidden bg-background shadow-[0_0_0_1px_var(--border)]">
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col transition-opacity duration-500 ease-out",
            className,
            exiting && "opacity-0",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
