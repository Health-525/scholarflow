import { cn } from "@/lib/utils";

interface StatChipProps {
  value: string;
  label: string;
  accent?: boolean;
}

export function StatChip({ value, label, accent }: StatChipProps) {
  return (
    <div className="rounded-lg p-2.5 text-center bg-secondary/60">
      <div
        className={cn(
          "text-base font-semibold tabular-nums",
          accent ? "text-statusSuccess" : "text-foreground",
        )}
      >
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
