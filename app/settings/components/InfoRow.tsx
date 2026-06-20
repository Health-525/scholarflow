"use client";

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

export function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="text-primary/60 shrink-0">{icon}</span>
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right ml-auto text-foreground">{value}</span>
    </div>
  );
}
