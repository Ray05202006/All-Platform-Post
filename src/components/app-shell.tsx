"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Editor" },
  { href: "/dashboard/scheduled", label: "Scheduled" },
  { href: "/dashboard/history", label: "History" },
  { href: "/dashboard/settings", label: "Settings" },
  { href: "/dashboard/logs", label: "Logs" },
];


interface AppShellProps {
  children: React.ReactNode;
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  onSignOut: () => void;
}

export function AppShell({ children, user, onSignOut }: AppShellProps) {
  const pathname = usePathname();

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "U";

  return (
    <div className="min-h-screen bg-background">
      {/* Top Glassmorphic Navigation */}
      <header className="bg-white/75 dark:bg-zinc-900/75 backdrop-blur-md border-b border-black/[0.06] dark:border-white/[0.06] sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6 md:gap-8">
              <Link href="/dashboard" className="flex items-center gap-2 group">
                <div className="w-8 h-8 bg-[#0071e3] text-white rounded-lg flex items-center justify-center shadow-[0_4px_12px_rgba(0,113,227,0.2)] group-active:scale-95 transition-all duration-200">
                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </div>
                <span className="text-sm font-semibold tracking-tight text-[#1d1d1f] dark:text-white hidden xs:block">
                  All-Platform-Post
                </span>
              </Link>
              
              <nav className="flex gap-0.5 bg-[#f5f5f7] dark:bg-zinc-800 p-0.5 rounded-full border border-black/[0.03] dark:border-white/[0.03]">
                {NAV_ITEMS.map((item) => {
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-[11px] md:text-xs font-semibold tracking-tight transition-all duration-200",
                        isActive
                          ? "bg-white dark:bg-zinc-700 text-[#1d1d1f] dark:text-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                          : "text-[#86868b] dark:text-zinc-400 hover:text-[#1d1d1f] dark:hover:text-white"
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <div className="flex items-center gap-2 bg-black/[0.02] dark:bg-white/[0.02] py-1 pl-1 pr-3 rounded-full border border-black/[0.03] dark:border-white/[0.03]">
                <Avatar className="h-6 w-6">
                  {user?.image && <AvatarImage src={user.image} alt={user.name ?? ""} />}
                  <AvatarFallback className="text-[10px] font-bold">{initials}</AvatarFallback>
                </Avatar>
                <span className="text-[11px] font-semibold text-[#1d1d1f] dark:text-zinc-200 max-w-[80px] md:max-w-[120px] truncate hidden sm:block">
                  {user?.name || user?.email}
                </span>
              </div>
              <Button
                variant="ghost"
                onClick={onSignOut}
                className="px-3 py-1.5 h-auto text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700/80 active:scale-[0.98] text-[#1d1d1f] dark:text-white rounded-full transition-all duration-200"
              >
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-10">
        {children}
      </main>
    </div>
  );
}
