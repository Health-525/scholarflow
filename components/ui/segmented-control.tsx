"use client"

import { type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface SegmentedOption {
  id: string
  label: string
  icon?: LucideIcon
}

interface SegmentedControlProps {
  options: SegmentedOption[]
  value: string
  onChange: (id: string) => void
  className?: string
}

export function SegmentedControl({ options, value, onChange, className }: SegmentedControlProps) {
  return (
    <div
      role="tablist"
      className={cn("flex gap-1 p-1 rounded-xl bg-secondary", className)}
    >
      {options.map((opt) => (
        <button
          key={opt.id}
          role="tab"
          aria-selected={value === opt.id}
          onClick={() => onChange(opt.id)}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[12px] font-medium transition-all duration-200",
            value === opt.id
              ? "bg-card text-primary shadow-sm"
              : "text-muted-foreground"
          )}
        >
          {opt.icon && <opt.icon className="w-3.5 h-3.5" />}
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  )
}
