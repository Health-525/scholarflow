"use client";

import { useEffect, useState } from "react";
import { useGitHubClient } from "@/hooks/useGitHubClient";
import { BookOpen, ClipboardList, Activity, HeartPulse } from "lucide-react";

interface DashboardSummary {
  overview: {
    courses: number;
    pendingAssignments: number;
    urgentAssignments: number;
    running: { total: number; morning: number; completed: boolean };
  };
  health: { agents: number; total: number; failing: number };
}

export function SummaryBanner() {
  const client = useGitHubClient();
  const [data, setData] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    if (!client) return;
    client.getFile("execution", "_out/dashboard-summary.json")
      .then(f => setData(JSON.parse(f.content)))
      .catch(() => {}); // 静默失败，不阻塞页面
  }, [client]);

  if (!data) return null;

  const { overview, health } = data;

  return (
    <div
      className="flex flex-wrap gap-3 mb-6 p-3 rounded-xl text-sm"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <StatBadge icon={BookOpen} label="课程" value={overview.courses} />
      <StatBadge
        icon={ClipboardList}
        label="作业"
        value={overview.pendingAssignments}
        alert={overview.urgentAssignments > 0}
        alertText={`${overview.urgentAssignments}项紧急`}
      />
      <StatBadge
        icon={Activity}
        label="跑步"
        value={overview.running.total}
        suffix={`/50${overview.running.completed ? " 🎉" : ""}`}
      />
      <StatBadge
        icon={HeartPulse}
        label="Agent"
        value={health.agents}
        suffix={`/${health.total}`}
        alert={health.failing > 0}
        alertText={`${health.failing}异常`}
      />
    </div>
  );
}

function StatBadge({
  icon: Icon, label, value, suffix = "", alert = false, alertText = "",
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: number | string;
  suffix?: string;
  alert?: boolean;
  alertText?: string;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "var(--surface-elevated)" }}>
      <div style={{ color: alert ? "var(--destructive, #ef4444)" : "var(--accent)", opacity: 0.7 }}>
        <Icon size={15} />
      </div>
      <span style={{ color: "var(--text-secondary)" }}>{label}</span>
      <span className="font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
        {value}{suffix}
      </span>
      {alert && alertText && (
        <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.15)", color: "var(--destructive, #ef4444)" }}>
          {alertText}
        </span>
      )}
    </div>
  );
}
