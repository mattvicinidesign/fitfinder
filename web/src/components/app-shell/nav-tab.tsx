"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { triggerNavHaptic } from "@/lib/haptics";
import { markProfileSheetEnter } from "@/lib/profile-sheet";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/navigation";

export function NavTab({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const prefix = item.href + "/";
  const active = pathname === item.href || pathname.startsWith(prefix);
  const Icon = item.icon;

  function handleClick() {
    triggerNavHaptic();
    if (item.href === "/profile" && pathname !== "/profile") {
      markProfileSheetEnter(pathname);
    }
  }

  return (
    <Link
      href={item.href}
      onClick={handleClick}
      className={cn(
        "flex flex-1 flex-col items-center justify-end gap-0.5 min-w-0 pb-1",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icon className="size-6" strokeWidth={active ? 2.25 : 1.75} />
      <span className="text-[10px] font-medium truncate max-w-full px-0.5">
        {item.label}
      </span>
    </Link>
  );
}
