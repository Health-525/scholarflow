"use client";

import { type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SegmentedOption {
  id: string;
  label: string;
  icon?: LucideIcon;
}

interface SegmentedControlProps {
  options: readonly SegmentedOption[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  panelIdPrefix?: string;
}

export function SegmentedControl({
  options,
  value,
  onChange,
  className,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  panelIdPrefix = "segmented",
}: SegmentedControlProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={cn("flex gap-1 p-1 rounded-xl bg-secondary", className)}
    >
      {options.map((opt) => {
        const selected = value === opt.id;
        return (
          <Button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`${panelIdPrefix}-${opt.id}-panel`}
            variant="ghost"
            onClick={() => onChange(opt.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2.5 h-auto rounded-lg text-[12px] font-medium transition-all duration-200",
              selected
                ? "bg-card text-primary shadow-sm hover:bg-card hover:text-primary"
                : "text-muted-foreground hover:bg-transparent hover:text-foreground",
            )}
          >
            {opt.icon && <opt.icon className="w-3.5 h-3.5" />}
            <span>{opt.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
