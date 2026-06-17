"use client";

import { forwardRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useProfileOverlay } from "@/components/app-shell/profile-overlay";
import { triggerNavHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/navigation";

type NavTabProps = {
  item: NavItem;
  magnifyScale?: number;
  lensHighlight?: boolean;
  onSelect?: () => void;
  shouldSuppressClick?: () => boolean;
};

export const NavTab = forwardRef<HTMLAnchorElement, NavTabProps>(function NavTab(
  {
    item,
    magnifyScale = 1,
    lensHighlight = false,
    onSelect,
    shouldSuppressClick,
  },
  ref,
) {
  const pathname = usePathname();
  const router = useRouter();
  const { openProfile } = useProfileOverlay();
  const prefix = item.href + "/";
  const active = pathname === item.href || pathname.startsWith(prefix);
  const Icon = item.icon;
  const isProfileTab = item.href === "/profile";
  const emphasized = active || lensHighlight;

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (shouldSuppressClick?.()) {
      event.preventDefault();
      return;
    }

    onSelect?.();
    triggerNavHaptic();

    if (isProfileTab) {
      if (pathname !== "/profile") {
        event.preventDefault();
        openProfile(pathname);
      }
      return;
    }

    if (pathname === "/profile") {
      event.preventDefault();
      router.replace(item.href);
    }
  }

  return (
    <Link
      ref={ref}
      href={item.href}
      onClick={handleClick}
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5",
        emphasized ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icon
        className="size-6 origin-center will-change-transform"
        strokeWidth={emphasized ? 2.25 : 1.75}
        style={{
          transform: `scale(${magnifyScale})`,
          transition: "transform 180ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
      <span
        className="max-w-full truncate text-[10px] font-medium origin-center will-change-transform"
        style={{
          transform: `scale(${Math.min(magnifyScale, 1.12)})`,
          transition: "transform 180ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {item.label}
      </span>
    </Link>
  );
});
