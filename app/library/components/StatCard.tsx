export interface StatCardProps {
  value: number;
  label: string;
  color?: string;
}

export function StatCard({ value, label, color }: StatCardProps) {
  return (
    <div className="text-center px-3">
      <div
        className="text-2xl sm:text-3xl font-bold tabular-nums"
        style={{ color }}
      >
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
