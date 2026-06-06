"use client";

import { ReactNode } from "react";
import { SideNav } from "./SideNav";
import { BottomNav } from "./BottomNav";
import { OfflineBanner } from "./OfflineBanner";
import { ActivityMonitor } from "@/components/activity/ActivityMonitor";
import { NotificationActivator } from "@/hooks/useNotifications";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { AIAssistant } from "@/components/ai/AIAssistant";
import { SmartReminders } from "@/components/reminders/SmartReminders";
import { PerformanceMonitor } from "@/components/monitoring/PerformanceMonitor";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

interface AppShellProps {
  children: ReactNode;
  isOnline?: boolean;
}

function ShortcutActivator() {
  useKeyboardShortcuts();
  return null;
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

      {/* Onboarding */}
      <OnboardingWizard />

      {/* AI Assistant */}
      <AIAssistant />

      {/* Activity monitor */}
      <ActivityMonitor />

      {/* Notification system */}
      <NotificationActivator />

      {/* Keyboard shortcuts */}
      <ShortcutActivator />
    </div>
  );
}

export default AppShell;
