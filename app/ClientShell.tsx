"use client";

import { useRouter, usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { applyTheme, watchSystemTheme } from "@/lib/theme";
import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";

const PUBLIC_PATHS = ["/setup"];

interface ClientShellProps {
  children: ReactNode;
}

export default function ClientShell({ children }: ClientShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const currentTheme = useThemeStore((s) => s.theme);
  const isOnline = useOnlineStatus();
  const [isRestoring, setIsRestoring] = useState(true);

  // Apply theme and watch system theme changes
  useEffect(() => {
    applyTheme(currentTheme);
    const unwatch = watchSystemTheme(() => applyTheme("system"));
    return () => unwatch();
  }, [currentTheme]);

  // Restore auth state on mount / route change
  useEffect(() => {
    async function restoreAuth() {
      // Server-side session is the source of truth.
      // Zustand persist already provides a synchronous fallback.
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.schoolId && data.userId) {
            // Local-first: only mark the session as authenticated and let the
            // user into the app. Data is read locally via /api/local-data by
            // each page; we never auto-fetch from the school server on startup.
            setAuth(data.schoolId, data.userId);
          } else {
            // 服务端已无有效会话，清除前端缓存的登录态，避免双数据源不一致
            clearAuth();
          }
        }
      } catch {
        // Offline or server error — rely on Zustand persist state
      } finally {
        setIsRestoring(false);
      }
    }

    restoreAuth();
  }, [setAuth, clearAuth, pathname]);

  // Route guard — redirect to /setup if not authenticated
  useEffect(() => {
    if (isRestoring) return;
    // Already on a public path — no redirect needed
    if (PUBLIC_PATHS.includes(pathname)) return;
    // Not authenticated and on a protected path — redirect to setup
    if (!isAuthenticated) {
      router.replace("/setup");
    }
  }, [isAuthenticated, pathname, router, isRestoring]);

  // On /setup page, render without AppShell
  if (PUBLIC_PATHS.includes(pathname)) {
    return <>{children}</>;
  }

  // While restoring auth state, render a minimal loader
  if (isRestoring) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-xl bg-primary/10 animate-breathe" />
      </div>
    );
  }

  // Not authenticated but not yet on /setup — show loading while redirect happens
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-xl bg-primary/10 animate-breathe" />
      </div>
    );
  }

  return <AppShell isOnline={isOnline}>{children}</AppShell>;
}
