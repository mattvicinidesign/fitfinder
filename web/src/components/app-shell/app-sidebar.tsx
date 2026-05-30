import Link from "next/link";
import { APP_NAV } from "@/lib/navigation";
import { NavLink } from "@/components/app-shell/nav-link";
import { AuthMenu } from "@/components/auth-menu";

/** Desktop navigation — left sidebar. */
export function AppSidebar() {
  return (
    <aside className="hidden md:flex w-56 shrink-0 flex-col border-r bg-background">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="font-semibold tracking-tight">
          Fit Finder
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {APP_NAV.map((item) => (
          <NavLink key={item.href} item={item} variant="sidebar" />
        ))}
      </nav>
      <div className="border-t p-3">
        <AuthMenu layout="sidebar" />
      </div>
    </aside>
  );
}
