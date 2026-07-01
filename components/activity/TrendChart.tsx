import { todayISO } from "@/lib/date-utils";
import { formatDuration } from "@/lib/format-duration";
import { cn } from "@/lib/utils";

interface TrendChartProps {
  trendDays: Array<{
    date: string;
    totalMinutes: number;
    idleMinutes: number;
    awayMinutes: number;
  }>;
}

export function TrendChart({ trendDays }: TrendChartProps) {
  if (trendDays.length === 0) return null;

  const max = Math.max(1, ...trendDays.map((d) => d.totalMinutes));

  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground/70">近 7 天趋势</h3>
      </div>
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
        <div className="p-4">
          <div className="flex gap-2 h-28">
            {trendDays.map((day) => {
              const h = Math.round((day.totalMinutes / max) * 100);
              const isMax = day.totalMinutes >= max;
              const isTodayBar = day.date === todayISO();
              return (
                <div
                  key={day.date}
                  className="flex-1 h-full flex flex-col justify-end items-center gap-1"
                >
                  <div className="w-full flex-1 flex items-end justify-center overflow-hidden">
                    <div
                      className={cn(
                        "w-full max-w-10 rounded-t-md hover:opacity-80 transition-opacity cursor-pointer",
                        isMax
                          ? "bg-gradient-to-t from-primary to-primary/60"
                          : "bg-muted",
                        isTodayBar && "ring-1 ring-primary/30"
                      )}
                      style={{ height: `${Math.max(h, 4)}%` }}
                      title={`${day.date}：${formatDuration(day.totalMinutes)}`}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {day.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
