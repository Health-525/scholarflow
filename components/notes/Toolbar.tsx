"use client";

import { cn } from "@/lib/utils";

interface ToolbarButtonProps {
  active?: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  shortcut?: string;
  variant?: "default" | "danger" | "gold";
}

export function ToolbarButton({ active, onClick, icon: Icon, label, shortcut, variant = "default" }: ToolbarButtonProps) {
  const title = shortcut ? `${label} (${shortcut})` : label;
  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-8 w-8 rounded-lg inline-flex items-center justify-center transition-colors",
        variant === "danger" && "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
        variant === "gold" && cn(
          "text-muted-foreground hover:text-status-warning hover:bg-status-warning/10",
          active && "text-status-warning bg-status-warning/10 ring-1 ring-status-warning/20"
        ),
        variant === "default" && cn(
          "text-muted-foreground hover:bg-sidebar-accent hover:text-primary",
          active && "bg-notes-active-bg text-primary ring-1 ring-primary/15"
        ),
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
