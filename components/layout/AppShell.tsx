"use client";

import { useEffect, useState, type ReactNode } from "react";

import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { GlobalSearch } from "@/components/ui/GlobalSearch";
import { KeyboardOverlay } from "@/components/ui/KeyboardOverlay";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { UpdateNotification } from "@/components/ui/UpdateNotification";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { NotificationActivator } from "@/hooks/useNotifications";
import { isElectron } from "@/lib/runtime-env";
import { semanticBg, semanticBorder, semanticColor } from "@/lib/theme-colors";
import { cn } from "@/lib/utils";

import { BottomNav } from "./BottomNav";
import { CuteTopBar } from "./CuteTopBar";
import { SideNav } from "./SideNav";

interface AppShellProps {
  children: ReactNode;
  isOnline?: boolean;
}

function ShortcutActivator() {
  useKeyboardShortcuts();
  return null;
}

export function AppShell({ children, isOnline }: AppShellProps) {
  const online = isOnline ?? true;
  const [showDragBar, setShowDragBar] = useState(false);

  useEffect(() => {
    setShowDragBar(isElectron());
  }, []);

  return (
    <div className="relative flex min-h-screen bg-background">
      <SideNav />
      <div className="relative z-[1] flex-1 flex flex-col h-screen min-w-0">
        {/* 拖拽条 — Electron 窗口拖拽区域，固定不动 */}
        {showDragBar && (
          <div
            className="h-9 shrink-0 flex items-center px-4 bg-background sticky top-0 z-10"
            style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
          >
            {/* 窗口控制按钮区域 — 不拖拽 */}
            <div style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties} className="flex-1" />
          </div>
        )}
        <CuteTopBar />
        {!online && (
          <div
            className={cn(
              "px-4 py-2.5 flex items-center justify-center gap-2 text-xs font-medium border-b animate-fade-in sticky z-10",
              showDragBar ? "top-[36px]" : "top-0"
            )}
            style={{ backgroundColor: semanticBg("warning"), color: semanticColor("warning"), borderBottomColor: semanticBorder("warning") }}
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728M5.636 18.364a9 9 0 010-12.728M12 12h.01" />
            </svg>
            网络连接已断开，离线数据仍可浏览
          </div>
        )}
        <main className="relative flex-1 overflow-y-auto pb-20 md:pb-0 px-4 md:px-8 lg:px-10">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
      <BottomNav />
      <NotificationActivator />
      <ShortcutActivator />
      <UpdateNotification />
      <KeyboardOverlay />
      <GlobalSearch />
      <ToastContainer />
    </div>
  );
}

export default AppShell;
