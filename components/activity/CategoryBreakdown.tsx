import { CATEGORY_CLASS, CATEGORY_ICON, CATEGORY_LABELS } from "@/components/activity/category-config";
import { Card, CardContent } from "@/components/ui/card";
import type { Category } from "@/lib/activity-tracker-v3";
import { cn } from "@/lib/utils";

interface CategoryBreakdownProps {
  categoryBreakdown: Array<{ category: Category; minutes: number }>;
  activeMinutes: number;
}

export function CategoryBreakdown({ categoryBreakdown, activeMinutes }: CategoryBreakdownProps) {
  if (categoryBreakdown.length === 0) return null;

  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground/70">分类占比</h3>
      </div>
      <Card>
        <CardContent className="p-4">
          <div className="h-2 overflow-hidden rounded-full bg-secondary flex mb-4">
            {categoryBreakdown.map((c) => {
              const cls = CATEGORY_CLASS[c.category];
              const width = Math.min(100, Math.round((c.minutes / Math.max(activeMinutes, 1)) * 100));
              return (
                <div
                  key={c.category}
                  className={cn("h-full min-w-[3px]", cls.bar)}
                  style={{ width: `${width}%` }}
                />
              );
            })}
          </div>
          <div className="space-y-2">
            {categoryBreakdown.map((c) => {
              const Icon = CATEGORY_ICON[c.category];
              const cls = CATEGORY_CLASS[c.category];
              const pct = Math.min(100, Math.round((c.minutes / Math.max(activeMinutes, 1)) * 100));
              return (
                <div key={c.category} className="flex items-center gap-3 text-xs hover:bg-muted/30 rounded-md px-2 py-1 -mx-2 transition-colors duration-150 cursor-pointer">
                  <div className={cn("flex size-7 items-center justify-center rounded-lg", cls.bg)}>
                    <Icon className={cn("size-3.5", cls.text)} />
                  </div>
                  <span className="text-foreground font-medium">{CATEGORY_LABELS[c.category]}</span>
                  <div className="flex-1" />
                  <span className="font-medium tabular-nums text-foreground">{c.minutes}分</span>
                  <span className="w-10 text-right tabular-nums text-muted-foreground">{pct}%</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
