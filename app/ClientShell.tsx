"use client";

import { ReactNode, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useAuthStore } from "@/store/auth";
import { applyTheme } from "@/lib/theme";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

const PUBLIC_PATHS = ["/setup"];

interface ClientShellProps {
  children: ReactNode;
}

export default function ClientShell({ children }: ClientShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isOnline = useOnlineStatus();

  // Apply theme on mount
  useEffect(() => {
    applyTheme();
  }, []);

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
