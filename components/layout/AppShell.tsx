"use client";

import { ReactNode } from "react";
import { SideNav } from "./SideNav";
import { BottomNav } from "./BottomNav";
import { NotificationActivator } from "@/hooks/useNotifications";
import { UpdateNotification } from "@/components/ui/UpdateNotification";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

interface AppShellProps {
  children: ReactNode;
  isOnline?: boolean;
}

function ShortcutActivator() {
  useKeyboardShortcuts();
  return null;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div
      className="flex min-h-screen"
      style={{ background: "var(--bg-gradient)", backgroundColor: "var(--background)" }}
    >
      {/* Desktop sidebar */}
      <SideNav />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Page content */}
        <main className="flex-1 pb-20 md:pb-0 px-4 md:px-8 lg:px-10 py-0">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav />

      {/* Notification system */}
      <NotificationActivator />

      {/* Keyboard shortcuts */}
      <ShortcutActivator />

      {/* Update notification */}
      <UpdateNotification />
    </div>
  );
}

export default AppShell;
