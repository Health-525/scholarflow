"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SettingsMenuItemProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  last?: boolean;
}

export function SettingsMenuItem({
  icon: Icon,
  label,
  onClick,
  disabled,
  danger,
  last,
}: SettingsMenuItemProps) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group w-full justify-start gap-3 px-2 py-2.5 h-auto text-left text-sm font-normal rounded-md transition-colors duration-150",
        !last && "border-b border-border rounded-b-none",
        disabled &&
          "text-muted-foreground opacity-50 cursor-default hover:bg-transparent",
        danger && !disabled && "text-destructive hover:bg-destructive/10",
        !danger && !disabled && "text-foreground hover:bg-secondary/50",
      )}
    >
      <Icon className={cn("size-4 shrink-0", danger && !disabled ? "text-destructive" : "text-muted-foreground")} />
      <span>{label}</span>
      {!disabled && (
        <ChevronRight className="size-3.5 ml-auto shrink-0 text-muted-foreground/60 group-hover:translate-x-0.5 transition-transform duration-150" />
      )}
    </Button>
  );
}
