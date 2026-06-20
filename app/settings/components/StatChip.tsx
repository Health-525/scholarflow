"use client";

import { cn } from "@/lib/utils";

interface StatChipProps {
  value: string;
  label: string;
  accent?: boolean;
}

export function StatChip({ value, label, accent }: StatChipProps) {
  return (
    <div className="rounded-xl p-2.5 text-center bg-secondary/60">
      <div
        className={cn(
          "text-[16px] font-semibold tabular-nums",
          accent ? "text-[var(--status-success)]" : "text-foreground",
        )}
      >
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
