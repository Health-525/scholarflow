"use client";

import { useRouter, usePathname } from "next/navigation";
import type { ReactNode} from "react";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import {
  secureRetrieveToken,
  migrateLegacyToken,
} from "@/lib/secure-auth";
import { applyTheme } from "@/lib/theme";
import { useAuthStore } from "@/store/auth";

const PUBLIC_PATHS = ["/setup"];

// Check if running without GitHub config (pure local mode)
const isLocalOnly = !process.env.NEXT_PUBLIC_GH_TOKEN && !process.env.NEXT_PUBLIC_E2E_TOKEN;

interface ClientShellProps {
  children: ReactNode;
}

export default function ClientShell({ children }: ClientShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setToken = useAuthStore((s) => s.setToken);
  const isOnline = useOnlineStatus();
  const [isRestoring, setIsRestoring] = useState(true);

  // Apply theme + restore secure token on mount
  useEffect(() => {
    applyTheme();

    async function restoreToken() {
      // If already authenticated from Zustand persist, skip
      if (useAuthStore.getState().isAuthenticated) {
        setIsRestoring(false);
        return;
      }

      // 0) 直接读localStorage — Zustand persist是异步的，可能还没恢复
      try {
        const raw = localStorage.getItem("sf_auth");
        if (raw) {
          const parsed = JSON.parse(raw);
          const stored = parsed?.state || parsed;
          if (stored?.token && stored?.isAuthenticated) {
            setToken(stored.token);
            setIsRestoring(false);
            return;
          }
        }
      } catch {}

      // 1) Try to retrieve from secure storage (Electron safeStorage or localStorage)
      const secureToken = await secureRetrieveToken();
      if (secureToken) {
        setToken(secureToken);
        setIsRestoring(false);
        return;
      }

      // 2) Try to migrate legacy localStorage token to secure storage
      const migrated = await migrateLegacyToken();
      if (migrated) {
        const migratedToken = await secureRetrieveToken();
        if (migratedToken) {
          setToken(migratedToken);
          setIsRestoring(false);
          return;
        }
      }

      // 3) Fallback to env token (development convenience, NOT for production)
      const envToken = process.env.NEXT_PUBLIC_GH_TOKEN;
      if (envToken) {
        setToken(envToken);
        setIsRestoring(false);
        return;
      }

      // 4) Local mode — skip GitHub, use local API
      // Always fallback to local mode when no GitHub token configured
      setToken("local-mode");
      setIsRestoring(false);
      return;
    }

    restoreToken().catch(() => setIsRestoring(false));
  }, [setToken]);

  // Route guard — skip in local-only mode, wait for restoration first
  useEffect(() => {
    if (isLocalOnly || isRestoring) return;
    if (!isAuthenticated && !PUBLIC_PATHS.includes(pathname)) {
      router.replace("/setup");
    }
  }, [isAuthenticated, pathname, router, isRestoring]);

  // On /setup page, render without AppShell
  if (isLocalOnly ? false : PUBLIC_PATHS.includes(pathname)) {
    return <>{children}</>;
  }

  // While restoring auth state, render a minimal loader to avoid redirect flash
  if (!isLocalOnly && isRestoring) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-xl bg-primary/10 animate-breathe" />
      </div>
    );
  }

  // While not authenticated (and about to redirect), render nothing
  if (!isLocalOnly && !isAuthenticated) {
    return null;
  }

  return <AppShell isOnline={isOnline}>{children}</AppShell>;
}
