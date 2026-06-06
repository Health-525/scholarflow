"use client";

import { ReactNode, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useAuthStore } from "@/store/auth";
import { applyTheme } from "@/lib/theme";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import {
  secureRetrieveToken,
  migrateLegacyToken,
} from "@/lib/secure-auth";

const PUBLIC_PATHS = ["/setup"];

interface ClientShellProps {
  children: ReactNode;
}

export default function ClientShell({ children }: ClientShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setToken = useAuthStore((s) => s.setToken);
  const isOnline = useOnlineStatus();

  // Apply theme + restore secure token on mount
  useEffect(() => {
    applyTheme();

    async function restoreToken() {
      // If already authenticated from Zustand persist, skip
      if (useAuthStore.getState().isAuthenticated) return;

      // 1) Try to retrieve from secure storage (Electron safeStorage or localStorage)
      const secureToken = await secureRetrieveToken();
      if (secureToken) {
        setToken(secureToken);
        return;
      }

      // 2) Try to migrate legacy localStorage token to secure storage
      const migrated = await migrateLegacyToken();
      if (migrated) {
        const migratedToken = await secureRetrieveToken();
        if (migratedToken) {
          setToken(migratedToken);
          return;
        }
      }

      // 3) Fallback to env token (development convenience, NOT for production)
      const envToken = process.env.NEXT_PUBLIC_GH_TOKEN;
      if (envToken) {
        setToken(envToken);
        return;
      }

      // 4) E2E test mode — skip GitHub verification entirely
      const e2eToken = process.env.NEXT_PUBLIC_E2E_TOKEN;
      if (e2eToken) {
        setToken(e2eToken);
      }
    }

    restoreToken();
  }, [setToken]);

  // Route guard
  useEffect(() => {
    if (!isAuthenticated && !PUBLIC_PATHS.includes(pathname)) {
      router.replace("/setup");
    }
  }, [isAuthenticated, pathname, router]);

  // On /setup page, render without AppShell
  if (PUBLIC_PATHS.includes(pathname)) {
    return <>{children}</>;
  }

  // While not authenticated (and about to redirect), render nothing
  if (!isAuthenticated) {
    return null;
  }

  return <AppShell isOnline={isOnline}>{children}</AppShell>;
}
