"use client";

import { ReactNode } from "react";
import { SideNav } from "./SideNav";
import { BottomNav } from "./BottomNav";
import { OfflineBanner } from "./OfflineBanner";

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
        <main className="flex-1 pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  );
}

export default AppShell;
