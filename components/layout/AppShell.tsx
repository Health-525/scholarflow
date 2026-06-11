"use client";

import { ReactNode } from "react";
import { SideNav } from "./SideNav";
import { BottomNav } from "./BottomNav";
import { NotificationActivator } from "@/hooks/useNotifications";
import { UpdateNotification } from "@/components/ui/UpdateNotification";
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

export function AppShell({ children, isOnline }: AppShellProps) {
  const online = useOnlineStatus();

  return (
    <div className="flex min-h-screen bg-background">
      <SideNav />
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Draggable titlebar region for frameless window — clean, like VS Code */}
        <div
          className="h-9 shrink-0 flex items-center select-none"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        />
        {/* Offline banner */}
        {!online && (
          <div className="px-4 py-2 text-[11px] font-medium text-center bg-amber-500/10 text-amber-600 border-b border-amber-500/20 animate-fade-in">
            网络连接已断开 · 数据将保存在本地
          </div>
        )}
        <main className="flex-1 pb-20 md:pb-0 px-4 md:px-8 lg:px-10 animate-page">
          {children}
        </main>
      </div>
      <BottomNav />
      <NotificationActivator />
      <ShortcutActivator />
      <UpdateNotification />
    </div>
  );
}

export default AppShell;