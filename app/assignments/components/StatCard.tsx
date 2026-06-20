"use client";

import { Card, cardClasses } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { TONE_STYLES, type Tone } from "../utils";

export function StatCard({
  icon: Icon,
  label,
  value,
  tone,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  tone: Tone;
  active?: boolean;
  onClick?: () => void;
}) {
  const style = TONE_STYLES[tone];
  const content = (
    <div className="flex items-center gap-3">
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: style.bg, color: style.color }}
      >
        <Icon className="size-5" />
      </div>
      <div>
        <div className="text-2xl font-bold tabular-nums leading-none text-foreground">
          {value}
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          cardClasses,
          "p-3 text-left cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]",
          active
            ? "ring-2 ring-primary/40 bg-primary/5"
            : "hover:bg-muted/50"
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <Card hover={false} className={cn("p-3", active && "ring-2 ring-primary/40 bg-primary/5")}>
      {content}
    </Card>
  );
}
