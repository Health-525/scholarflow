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
        "w-full justify-start gap-3 px-2 py-3 h-auto text-left text-[13px] font-normal rounded-none",
        !last && "border-b border-border",
        disabled &&
          "text-muted-foreground opacity-50 cursor-default hover:bg-transparent",
        danger && !disabled && "text-destructive hover:bg-destructive/8",
        !danger && !disabled && "text-foreground hover:bg-secondary/40",
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span>{label}</span>
      {!disabled && (
        <ChevronRight className="w-3.5 h-3.5 ml-auto shrink-0 text-muted-foreground" />
      )}
    </Button>
  );
}
