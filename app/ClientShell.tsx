"use client";

import { useRouter, usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { applyTheme } from "@/lib/theme";
import { useAuthStore } from "@/store/auth";

const PUBLIC_PATHS = ["/setup"];

interface ClientShellProps {
  children: ReactNode;
}

export default function ClientShell({ children }: ClientShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setAuth = useAuthStore((s) => s.setAuth);
  const isOnline = useOnlineStatus();
  const [isRestoring, setIsRestoring] = useState(true);

  // Apply theme + restore auth state on mount
  useEffect(() => {
    applyTheme();

    async function restoreAuth() {
      // Server-side session is the source of truth.
      // Zustand persist already provides a synchronous fallback.
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.schoolId && data.userId) {
            setAuth(data.schoolId, data.userId);

            // Auto-refresh data on session restore when on a protected page
            if (!PUBLIC_PATHS.includes(pathname)) {
              try {
                await fetch("/api/fetch/all", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ schoolId: data.schoolId, username: data.userId }),
                });
              } catch {
                // Refresh is best-effort; do not block auth restore
              }
            }
          }
        }
      } catch {
        // Offline or server error — rely on Zustand persist state
      } finally {
        setIsRestoring(false);
      }
    }

    restoreAuth();
  }, [setAuth, pathname]);

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
