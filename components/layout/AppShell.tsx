"use client";

import { ReactNode } from "react";
import { SideNav } from "./SideNav";
import { BottomNav } from "./BottomNav";
import { OfflineBanner } from "./OfflineBanner";
import { AIChat } from "@/components/chat/AIChat";
import { PomodoroTimer } from "@/components/pomodoro/PomodoroTimer";
import { NotificationActivator } from "@/hooks/useNotifications";
import { GlobalSearch } from "@/components/search/GlobalSearch";

interface AppShellProps {
  children: ReactNode;
  isOnline?: boolean;
}

export function AppShell({ children, isOnline = true }: AppShellProps) {
  return (
    <div
      className="flex min-h-screen"
      style={{ background: "var(--bg-gradient)", backgroundColor: "var(--background)" }}
    >
      {/* Desktop sidebar */}
      <SideNav />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Offline banner */}
        <OfflineBanner isOnline={isOnline} />

        {/* Page content */}
        <main className="flex-1 pb-20 md:pb-0 px-4 md:px-8 lg:px-10 py-0">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav />

      {/* Global search (Ctrl+K) */}
      <GlobalSearch />

      {/* AI Chat assistant */}
      <AIChat />

      {/* Pomodoro timer */}
      <PomodoroTimer />

      {/* Notification system */}
      <NotificationActivator />
    </div>
  );
}

export default AppShell;
