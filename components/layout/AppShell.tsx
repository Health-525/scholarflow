"use client";

import { ReactNode } from "react";
import { SideNav } from "./SideNav";
import { BottomNav } from "./BottomNav";
import { NotificationActivator } from "@/hooks/useNotifications";
import { UpdateNotification } from "@/components/ui/UpdateNotification";
import { KeyboardOverlay } from "@/components/ui/KeyboardOverlay";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

interface AppShellProps {
  children: ReactNode;
  isOnline?: boolean;
}

function ShortcutActivator() {
  useKeyboardShortcuts();
  return null;
}

export function AppShell({ children }: AppShellProps) {
  const online = useOnlineStatus();

  return (
    <div className="relative flex min-h-screen bg-background">
      <SideNav />
      <div className="relative z-[1] flex-1 flex flex-col min-h-screen min-w-0">
        {!online && (
          <div className="px-4 py-2.5 flex items-center justify-center gap-2 text-[12px] font-medium bg-amber-500/8 text-amber-600 border-b border-amber-500/15 animate-fade-in">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728M5.636 18.364a9 9 0 010-12.728M12 12h.01" />
            </svg>
            网络连接已断开，离线数据仍可浏览
          </div>
        )}
        <main className="relative flex-1 pb-20 md:pb-0 px-4 md:px-8 lg:px-10 animate-page">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
      <BottomNav />
      <NotificationActivator />
      <ShortcutActivator />
      <UpdateNotification />
      <KeyboardOverlay />
      <ToastContainer />
    </div>
  );
}

export default AppShell;
