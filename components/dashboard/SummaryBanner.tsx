"use client";

import { BookOpen, ClipboardList, Activity, Calculator } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
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

function StatMiniCard({
  icon: Icon,
  label,
  value,
  colorClass,
  iconBgClass,
  badge,
  badgeClass,
}: {
  icon: typeof BookOpen;
  label: string;
  value: number | string;
  colorClass: string;
  iconBgClass: string;
  badge?: string;
  badgeClass?: string;
}) {
  return (
    <div className={cn(cardClasses, "p-3 hover:-translate-y-1")}>
      <div
        className={`absolute -right-3 -top-3 w-20 h-20 rounded-full pointer-events-none opacity-[0.04] dark:opacity-[0.08] group-hover:opacity-[0.08] dark:group-hover:opacity-[0.14] transition-opacity duration-300 ${iconBgClass}`}
      />
      <div className="relative">
        <div
          className={`w-[44px] h-[44px] rounded-xl flex items-center justify-center mb-3 transition-transform duration-200 group-hover:scale-110 ${iconBgClass}`}
        >
          <Icon size={18} className={colorClass} />
        </div>
        <div className="text-[11px] text-muted-foreground font-medium">
          {label}
        </div>
        <div
          className={`text-[36px] font-bold tabular-nums leading-none mt-1 ${colorClass}`}
        >
          <AnimatedNumber value={value} />
        </div>
        {badge && (
          <Badge variant="outline" className={`text-[10px] h-4 px-1 mt-1 border-transparent ${badgeClass}`}>
            {badge}
          </Badge>
        )}
      </div>
    </div>
  );
}

interface SummaryBannerProps {
  data: DashboardSummary | null;
  loading?: boolean;
}

export function SummaryBanner({ data, loading = true }: SummaryBannerProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              cardClasses,
              "p-4 hover:translate-y-0 hover:shadow-sm",
            )}
          >
            <div className="skeleton w-8 h-8 rounded-xl mb-2" />
            <div className="skeleton w-12 h-3 rounded mb-1.5" />
            <div className="skeleton w-16 h-7 rounded" />
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
        colorClass: "text-primary",
        iconBgClass: "bg-primary/10",
      },
      {
        icon: ClipboardList,
        label: "待办作业",
        colorClass: "text-[var(--status-warning)]",
        iconBgClass: "bg-[var(--status-warning)]/10",
      },
      {
        icon: Activity,
        label: "跑步",
        colorClass: "text-[var(--status-success)]",
        iconBgClass: "bg-[var(--status-success)]/10",
      },
      {
        icon: Calculator,
        label: "绩点",
        colorClass: "text-primary",
        iconBgClass: "bg-primary/10",
      },
    ];
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {fallbackItems.map((item, i) => (
          <div
            key={i}
            className={cn(
              cardClasses,
              "p-4 hover:translate-y-0 hover:shadow-sm",
            )}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2.5 ${item.iconBgClass}`}
            >
              <item.icon size={15} className={item.colorClass} />
            </div>
            <div className="text-[11px] mb-0.5 text-muted-foreground font-medium">
              {item.label}
            </div>
            <div className="text-[22px] font-bold tabular-nums text-muted-foreground leading-none">
              --
            </div>
          </div>
        ))}
      </div>
    );
  }

  const { overview } = data;

  const urgentAssign = overview.urgentAssignments > 0;
  const runningDone = overview.running?.completed;

  const items: {
    icon: typeof BookOpen;
    label: string;
    value: number | string;
    colorClass: string;
    iconBgClass: string;
    badge?: string;
    badgeClass?: string;
  }[] = [
    {
      icon: BookOpen,
      label: "今日课程",
      value: overview.todayCourses,
      colorClass: "text-primary",
      iconBgClass: "bg-primary/10",
    },
    {
      icon: ClipboardList,
      label: "待办作业",
      value: overview.pendingAssignments,
      colorClass: urgentAssign
        ? "text-destructive"
        : "text-[var(--status-warning)]",
      iconBgClass: urgentAssign
        ? "bg-destructive/10"
        : "bg-[var(--status-warning)]/10",
      badge: urgentAssign ? `${overview.urgentAssignments}紧急` : undefined,
      badgeClass: urgentAssign
        ? "bg-destructive/10 text-destructive"
        : "bg-[var(--status-warning)]/10 text-[var(--status-warning)]",
    },
    {
      icon: Activity,
      label: "阳光长跑",
      value: overview.running?.total ?? 0,
      colorClass: runningDone
        ? "text-[var(--status-success)]"
        : "text-[var(--status-warning)]",
      iconBgClass: runningDone
        ? "bg-[var(--status-success)]/10"
        : "bg-[var(--status-warning)]/10",
      badge: runningDone ? "已达标" : undefined,
      badgeClass: runningDone
        ? "bg-[var(--status-success)]/10 text-[var(--status-success)]"
        : "",
    },
  ];

  if (overview.gpa && parseFloat(overview.gpa) > 0) {
    const gpaCls = gpaColorClasses(parseFloat(overview.gpa));
    items.push({
      icon: Calculator,
      label: "绩点",
      value: overview.gpa,
      colorClass: gpaCls.colorClass,
      iconBgClass: gpaCls.iconBgClass,
    });
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map((item, i) => (
        <StatMiniCard key={i} {...item} />
      ))}
    </div>
  );
}
