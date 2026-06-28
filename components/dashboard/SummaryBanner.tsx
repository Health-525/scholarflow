"use client";

import { BookOpen, ClipboardList, Calculator } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";

import { cardClasses } from "@/components/ui/card";
import type { DashboardSummary } from "@/lib/dashboard/summary";
import { gpaColorClasses } from "@/lib/gpa";
import { cn } from "@/lib/utils";

function AnimatedNumber({
  value,
  duration = 800,
}: {
  value: number | string;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  const numValue = typeof value === "string" ? parseFloat(value) || 0 : value;
  const decimals =
    typeof value === "string"
      ? value.split(".")[1]?.length || 0
      : Number.isInteger(value)
        ? 0
        : 2;

  useEffect(() => {
    if (isNaN(numValue)) {
      setDisplay(0);
      return;
    }
    const start = prevRef.current;
    const diff = numValue - start;
    if (diff === 0) {
      setDisplay(numValue);
      return;
    }
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const raw = start + diff * eased;
      setDisplay(
        decimals > 0 ? parseFloat(raw.toFixed(decimals)) : Math.round(raw),
      );
      if (progress < 1) requestAnimationFrame(animate);
      else prevRef.current = numValue;
    };
    requestAnimationFrame(animate);
  }, [numValue, duration, decimals]);

  if (typeof value === "string" && isNaN(numValue)) return <span>{value}</span>;
  return (
    <span className="tabular-nums">
      {decimals > 0 ? display.toFixed(decimals) : display}
    </span>
  );
}

const StatMiniCard = memo(function StatMiniCard({
  icon: Icon,
  label,
  value,
  colorClass,
}: {
  icon: typeof BookOpen;
  label: string;
  value: number | string;
  colorClass: string;
}) {
  return (
    <div className={cn(cardClasses, "p-4 flex flex-row items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200")}>
      <Icon className="size-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground font-medium">
          {label}
        </div>
        <div
          className={`text-3xl font-bold tabular-nums leading-none mt-0.5 ${colorClass}`}
        >
          <AnimatedNumber value={value} />
        </div>
      </div>
    </div>
  );
});

interface SummaryBannerProps {
  data: DashboardSummary | null;
  loading?: boolean;
}

export const SummaryBanner = memo(function SummaryBanner({ data, loading = true }: SummaryBannerProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              cardClasses,
              "p-4 flex flex-row items-center gap-3 hover:translate-y-0 hover:shadow-sm",
            )}
          >
            <div className="skeleton size-5 shrink-0 rounded" />
            <div className="space-y-1.5">
              <div className="skeleton w-12 h-2.5 rounded" />
              <div className="skeleton w-16 h-6 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!data) {
    const fallbackItems = [
      {
        icon: BookOpen,
        label: "今日课程",
      },
      {
        icon: ClipboardList,
        label: "待办作业",
      },
      {
        icon: Calculator,
        label: "绩点",
      },
    ];
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {fallbackItems.map((item, i) => (
          <div
            key={i}
            className={cn(
              cardClasses,
              "p-4 flex flex-row items-center gap-3 hover:translate-y-0 hover:shadow-sm",
            )}
          >
            <item.icon className="size-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground font-medium">
                {item.label}
              </div>
              <div className="text-2xl font-semibold tabular-nums text-muted-foreground/70 leading-none mt-0.5">
                --
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const { overview } = data;

  const urgentAssign = overview.urgentAssignments > 0;

  const items: {
    icon: typeof BookOpen;
    label: string;
    value: number | string;
    colorClass: string;
  }[] = [
    {
      icon: BookOpen,
      label: "今日课程",
      value: overview.todayCourses,
      colorClass: "text-foreground",
    },
    {
      icon: ClipboardList,
      label: "待办作业",
      value: overview.pendingAssignments > 99 ? "99+" : overview.pendingAssignments,
      colorClass: urgentAssign ? "text-destructive" : "text-foreground",
    },
  ];

  if (overview.gpa && parseFloat(overview.gpa) > 0) {
    const gpaCls = gpaColorClasses(parseFloat(overview.gpa));
    items.push({
      icon: Calculator,
      label: "绩点",
      value: overview.gpa,
      colorClass: gpaCls.colorClass,
    });
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {items.map((item, i) => (
        <StatMiniCard key={i} {...item} />
      ))}
    </div>
  );
});
