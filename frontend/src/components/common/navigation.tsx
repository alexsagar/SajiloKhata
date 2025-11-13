import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { groupAPI, expenseAPI, userAPI, analyticsAPI, conversationAPI, calendarAPI } from "@/lib/api";

const Navigation: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();

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
    <nav className="flex items-center justify-between px-6 py-4 bg-white shadow">
      <div className="flex space-x-4">
        <Link href="/" className="nav-link" onMouseEnter={() => prefetchRoute('/')}>Home</Link>
        <Link href="/groups" className="nav-link" onMouseEnter={prefetchGroups}>Groups</Link>
        <Link href="/expenses" className="nav-link" onMouseEnter={prefetchExpenses}>Expenses</Link>
        <Link href="/profile" className="nav-link" onMouseEnter={prefetchProfile}>Profile</Link>
      </div>
      <div>
        {isAuthenticated ? (
          <button className="btn" onClick={logout}>
            Logout ({user?.name})
          </button>
        ) : (
          <Link href="/login" className="btn">Login</Link>
        )}
      </div>
    </nav>
  );
};

export default Navigation;