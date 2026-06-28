interface StatChipProps {
  value: string;
  label: string;
}

export function StatChip({ value, label }: StatChipProps) {
  return (
    <div className="rounded-lg p-2.5 text-center bg-secondary/50 hover:shadow-sm transition-shadow duration-150">
      <div className="text-base font-semibold tabular-nums text-foreground">
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
