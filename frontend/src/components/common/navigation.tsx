import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { groupAPI, expenseAPI, userAPI, analyticsAPI, conversationAPI, calendarAPI } from "@/lib/api";

const Navigation: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Helper to prefetch a Next.js route
  const prefetchRoute = (href: string) => {
    try { router.prefetch?.(href); } catch {}
  };

  const prefetchGroups = () => {
    prefetchRoute("/groups");
    if (!isAuthenticated) return;
    queryClient.prefetchQuery({
      queryKey: ["groups", "list", { page: 1 }],
      queryFn: () => groupAPI.getGroups({ page: 1, limit: 10 }),
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchExpenses = () => {
    prefetchRoute("/expenses");
    if (!isAuthenticated) return;
    queryClient.prefetchQuery({
      queryKey: ["expenses", "list", { page: 1 }],
      queryFn: () => expenseAPI.getExpenses({ page: 1, limit: 10 } as any),
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchProfile = () => {
    prefetchRoute("/profile");
    queryClient.prefetchQuery({
      queryKey: ["user", "profile"],
      queryFn: () => userAPI.getProfile(),
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchAnalytics = () => {
    prefetchRoute("/analytics");
    if (!isAuthenticated) return;
    queryClient.prefetchQuery({
      queryKey: ["analytics-kpis", { prefetch: true }],
      queryFn: () => analyticsAPI.getKPIs({ limit: 5 }),
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchChat = () => {
    prefetchRoute("/chat");
    if (!isAuthenticated) return;
    queryClient.prefetchQuery({
      queryKey: ["conversations", "list"],
      queryFn: () => conversationAPI.list(),
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchCalendar = () => {
    prefetchRoute("/calendar");
    if (!isAuthenticated) return;
    const now = new Date();
    queryClient.prefetchQuery({
      queryKey: ["calendar", now.getFullYear(), now.getMonth() + 1],
      queryFn: () => calendarAPI.getMonth({ year: now.getFullYear(), month: now.getMonth() + 1 }),
      staleTime: 5 * 60 * 1000,
    });
  };

  // Warm common routes on mount
  useEffect(() => {
    prefetchRoute("/groups");
    prefetchRoute("/expenses");
    prefetchRoute("/profile");
    prefetchRoute("/chat");
    prefetchRoute("/analytics");
    prefetchRoute("/calendar");

    // Idle-time data prefetching for slow pages
    const ric: any = (window as any).requestIdleCallback || ((cb: Function) => setTimeout(() => cb(), 300));
    const idleId = ric(() => {
      if (isAuthenticated) {
        prefetchGroups();
        prefetchExpenses();
        prefetchProfile();
        prefetchChat();
        prefetchAnalytics();
        prefetchCalendar();
      }
    });
    return () => { try { (window as any).cancelIdleCallback?.(idleId) } catch {} };
  }, []);

  return (
    <nav className="w-full bg-white shadow-sm border-b border-slate-200">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Left: Brand + primary links (desktop) */}
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/" className="flex items-center gap-2" onMouseEnter={() => prefetchRoute('/')}>
            <Image src="/images/logo.png" alt="SajiloKhata" width={40} height={40} className="rounded-lg" />
            <span className="font-semibold text-slate-900 whitespace-nowrap">SajiloKhata</span>
          </Link>
          <div className="hidden md:flex items-center gap-4 text-sm text-slate-700">
            <Link href="/groups" className="hover:text-slate-900" onMouseEnter={prefetchGroups}>Groups</Link>
            <Link href="/expenses" className="hover:text-slate-900" onMouseEnter={prefetchExpenses}>Expenses</Link>
            <Link href="/profile" className="hover:text-slate-900" onMouseEnter={prefetchProfile}>Profile</Link>
          </div>
        </div>

        {/* Right: Auth actions + mobile toggle */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            {isAuthenticated ? (
              <button
                className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                onClick={logout}
              >
                Logout {user?.name && <span className="hidden sm:inline">({user.name})</span>}
              </button>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
              >
                Login
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 text-slate-700 md:hidden"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
          >
            <span className="sr-only">Open main menu</span>
            <span className="block h-0.5 w-5 bg-slate-700" />
            <span className="block h-0.5 w-5 bg-slate-700 mt-1" />
            <span className="block h-0.5 w-5 bg-slate-700 mt-1" />
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {isMobileMenuOpen && (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 text-sm text-slate-700">
            <Link href="/" className="py-2" onMouseEnter={() => prefetchRoute('/')}>Home</Link>
            <Link href="/groups" className="py-2" onMouseEnter={prefetchGroups}>Groups</Link>
            <Link href="/expenses" className="py-2" onMouseEnter={prefetchExpenses}>Expenses</Link>
            <Link href="/profile" className="py-2" onMouseEnter={prefetchProfile}>Profile</Link>
            <div className="mt-2 border-t border-slate-200 pt-2">
              {isAuthenticated ? (
                <button
                  className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  onClick={logout}
                >
                  Logout
                </button>
              ) : (
                <Link
                  href="/login"
                  className="block w-full rounded-md border border-slate-300 px-4 py-2 text-center text-sm font-medium text-slate-900 hover:bg-slate-50"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;