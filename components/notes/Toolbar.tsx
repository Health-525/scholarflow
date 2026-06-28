"use client";

import { cn } from "@/lib/utils";

interface ToolbarButtonProps {
  active?: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  shortcut?: string;
}

export function ToolbarButton({ active, onClick, icon: Icon, label, shortcut }: ToolbarButtonProps) {
  const title = shortcut ? `${label} (${shortcut})` : label;
  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-8 w-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:bg-sidebar-accent hover:text-primary transition-all duration-150",
        active && "bg-notes-active-bg text-primary shadow-[0_0_0_1px_rgba(51,112,255,0.15)]"
      )}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

export function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

export function ToolbarDivider() {
  return <div className="w-px h-5 bg-border mx-0.5 shrink-0" />;
}
