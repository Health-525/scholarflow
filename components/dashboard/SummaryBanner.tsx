"use client";

import { useEffect, useState } from "react";
import { useGitHubClient } from "@/hooks/useGitHubClient";
import { BookOpen, ClipboardList, Activity, Calculator } from "lucide-react";
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
        {[1,2,3,4].map(i => (
          <div key={i} className="rounded-xl p-3.5 bg-card border border-border">
            <div className="skeleton w-7 h-7 rounded-lg mb-2" />
            <div className="skeleton w-10 h-3 rounded mb-1" />
            <div className="skeleton w-14 h-6 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!data) {
    const fallbackItems = [
      { icon: BookOpen, label: "课程", colorClass: "text-primary", bgClass: "bg-primary/5" },
      { icon: ClipboardList, label: "待办", colorClass: "text-amber-600", bgClass: "bg-amber-500/5" },
      { icon: Activity, label: "跑步", colorClass: "text-amber-600", bgClass: "bg-amber-500/5" },
      { icon: Calculator, label: "绩点", colorClass: "text-primary", bgClass: "bg-primary/5" },
    ];
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
        {fallbackItems.map((item, i) => (
          <div key={i} className="rounded-xl p-3.5 bg-card border border-border shadow-sm">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 ${item.bgClass}`}>
              <item.icon size={14} className={item.colorClass} />
            </div>
            <div className="text-[10px] mb-0.5 text-muted-foreground">{item.label}</div>
            <div className="text-[20px] font-bold tabular-nums text-muted-foreground">--</div>
          </div>
        ))}
      </div>
    );
  }

  const { overview } = data;

  const items = [
    { icon: BookOpen, label: "课程", value: overview.courses, color: "#2a4494" },
    { icon: ClipboardList, label: "待办", value: overview.pendingAssignments, color: overview.urgentAssignments > 0 ? "#c0392b" : "#b85c00", badge: overview.urgentAssignments > 0 ? `${overview.urgentAssignments}紧急` : undefined },
    { icon: Activity, label: "跑步", value: `${overview.running?.total ?? 0}/50`, color: overview.running?.completed ? "#2d7a4f" : "#b85c00", badge: overview.running?.completed ? "达标" : undefined },
    ...(overview.gpa && parseFloat(overview.gpa) > 0 ? [{ icon: Calculator, label: "绩点", value: overview.gpa, color: gpaColor(parseFloat(overview.gpa)) }] : []),
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
      {items.map((item, i) => (
        <div key={i} className="rounded-xl p-3.5 relative overflow-hidden bg-card border border-border shadow-sm">
          <div className="absolute -right-2 -top-2 w-16 h-16 rounded-full opacity-[0.06] pointer-events-none" style={{ backgroundColor: item.color }} />
          <div className="relative flex items-start justify-between">
            <div>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: `${item.color}12` }}>
                <item.icon size={14} style={{ color: item.color }} />
              </div>
              <div className="text-[10px] mb-0.5 text-muted-foreground">{item.label}</div>
              <div className="text-[20px] font-bold tabular-nums leading-tight" style={{ color: item.color }}>{item.value}</div>
            </div>
            {item.badge && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md mt-0.5" style={{
                backgroundColor: item.color === "#2d7a4f" ? "rgba(34,197,94,0.12)" : "rgba(192,57,43,0.10)",
                color: item.color,
              }}>
                {item.badge}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
