"use client";

import { useEffect, useState, useRef } from "react";
import { useGitHubClient } from "@/hooks/useGitHubClient";
import { BookOpen, ClipboardList, Activity, Calculator, TrendingUp, Zap } from "lucide-react";
import { gpaColor } from "@/lib/gpa";

interface DashboardSummary {
  overview: {
    courses: number;
    pendingAssignments: number;
    urgentAssignments: number;
    running: { total: number; morning: number; completed: boolean };
    gpa?: string;
  };
  health: { agents: number; total: number; failing: number };
}

// Animated number counter
function AnimatedNumber({ value, duration = 800 }: { value: number | string; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  const numValue = typeof value === "string" ? parseFloat(value) || 0 : value;

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
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(animate);
      else prevRef.current = numValue;
    };
    requestAnimationFrame(animate);
  }, [numValue, duration]);

  if (typeof value === "string" && isNaN(numValue)) return <span>{value}</span>;
  return <span className="tabular-nums">{display}</span>;
}

export function SummaryBanner() {
  const client = useGitHubClient();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/local-data?type=dashboard")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => {
        if (client) {
          client.getFile("execution", "_out/dashboard-summary.json")
            .then(f => { setData(JSON.parse(f.content)); setLoading(false); })
            .catch(() => setLoading(false));
        } else {
          setLoading(false);
        }
      });
  }, [client]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[1,2,3,4].map(i => (
          <div key={i} className="rounded-2xl p-4 bg-card border border-border">
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
      { icon: BookOpen, label: "课程", colorClass: "text-primary", bgClass: "bg-primary/8" },
      { icon: ClipboardList, label: "待办", colorClass: "text-amber-600", bgClass: "bg-amber-500/8" },
      { icon: Activity, label: "跑步", colorClass: "text-green-600", bgClass: "bg-green-500/8" },
      { icon: Calculator, label: "绩点", colorClass: "text-primary", bgClass: "bg-primary/8" },
    ];
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {fallbackItems.map((item, i) => (
          <div key={i} className="rounded-2xl p-4 bg-card border border-border shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2.5 ${item.bgClass}`}>
              <item.icon size={15} className={item.colorClass} />
            </div>
            <div className="text-[11px] mb-0.5 text-muted-foreground font-medium">{item.label}</div>
            <div className="text-[22px] font-bold tabular-nums text-muted-foreground leading-none">--</div>
          </div>
        ))}
      </div>
    );
  }

  const { overview } = data;

  const items = [
    {
      icon: BookOpen,
      label: "今日课程",
      value: overview.courses,
      color: "#2a4494",
      sub: overview.courses > 0 ? `${overview.courses} 门课` : "无课程",
    },
    {
      icon: ClipboardList,
      label: "待办作业",
      value: overview.pendingAssignments,
      color: overview.urgentAssignments > 0 ? "#c0392b" : "#b85c00",
      badge: overview.urgentAssignments > 0 ? `${overview.urgentAssignments}紧急` : undefined,
      sub: overview.pendingAssignments > 0 ? `${overview.pendingAssignments} 项` : "全部完成",
    },
    {
      icon: Activity,
      label: "阳光长跑",
      value: overview.running?.total ?? 0,
      color: overview.running?.completed ? "#2d7a4f" : "#b85c00",
      badge: overview.running?.completed ? "已达标" : undefined,
      sub: `${overview.running?.total ?? 0}/50 次`,
    },
    ...(overview.gpa && parseFloat(overview.gpa) > 0 ? [{
      icon: Calculator,
      label: "绩点",
      value: overview.gpa,
      color: gpaColor(parseFloat(overview.gpa)),
      sub: `GPA ${overview.gpa}`,
    }] : []),
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      {items.map((item, i) => (
        <div
          key={i}
          className="rounded-2xl p-4 relative overflow-hidden bg-card border border-border shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 group"
        >
          {/* Background accent blob */}
          <div className="absolute -right-3 -top-3 w-20 h-20 rounded-full opacity-[0.04] pointer-events-none group-hover:opacity-[0.08] transition-opacity duration-300" style={{ backgroundColor: item.color }} />

          <div className="relative">
            {/* Icon */}
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2.5 transition-transform duration-200 group-hover:scale-110" style={{ backgroundColor: `${item.color}12` }}>
              <item.icon size={15} style={{ color: item.color }} />
            </div>

            {/* Label */}
            <div className="text-[11px] mb-0.5 text-muted-foreground font-medium">{item.label}</div>

            {/* Value with animation */}
            <div className="text-[22px] font-bold tabular-nums leading-none" style={{ color: item.color }}>
              <AnimatedNumber value={item.value} />
            </div>

            {/* Badge */}
            {item.badge && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md mt-1 inline-block" style={{
                backgroundColor: item.color === "#2d7a4f" ? "rgba(34,197,94,0.12)" : "rgba(192,57,43,0.10)",
                color: item.color,
              }}>
                {item.badge}
              </span>
            )}

            {/* Sub text */}
            <div className="text-[10px] text-muted-foreground mt-1">{item.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}