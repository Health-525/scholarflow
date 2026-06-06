"use client";

import { useEffect, useState } from "react";
import { useGitHubClient } from "@/hooks/useGitHubClient";
import { Activity, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";

interface AgentStatus {
  agent: string;
  lastRun: string;
  success: boolean;
  elapsedMs: number | null;
  summary: Record<string, unknown>;
  errors: string[];
}

interface HealthData {
  updatedAt: string;
  agents: AgentStatus[];
  summary: {
    total: number;
    healthy: number;
    failing: number;
  };
}

const AGENT_LABELS: Record<string, string> = {
  "timetable-generator": "课表管家",
  "assignment-parser": "作业管家",
  "adjustment-parser": "调课助手",
  "running-parser": "运动监督",
  "daily-reporter": "日报秘书",
  "weekly-reporter": "周报分析师",
  "auto-researcher": "自主研究",
  "knowledge-analyzer": "知识分析",
};

function formatElapsed(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 60000)}m`;
}

function formatTime(ts: string): string {
  try {
    const d = new Date(ts + "+08:00");
    const now = new Date();
    const diffH = Math.round((now.getTime() - d.getTime()) / 3600000);
    if (diffH < 1) return "刚刚";
    if (diffH < 24) return `${diffH}h前`;
    if (diffH < 48) return "昨天";
    return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
  } catch {
    return ts;
  }
}

function AgentCard({ agent }: { agent: AgentStatus }) {
  const label = AGENT_LABELS[agent.agent] || agent.agent;

  return (
    <div
      className="rounded-xl p-4 border"
      style={{
        background: "var(--surface)",
        borderColor: agent.success ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
          {label}
        </span>
        {agent.success ? (
          <CheckCircle2 size={18} className="text-green-500" />
        ) : (
          <XCircle size={18} className="text-red-500" />
        )}
      </div>

      <div className="space-y-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
        <div className="flex items-center gap-1.5">
          <Clock size={12} />
          <span>{formatTime(agent.lastRun)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Activity size={12} />
          <span>{formatElapsed(agent.elapsedMs)}</span>
        </div>
        {agent.summary && Object.keys(agent.summary).length > 0 && (
          <div className="mt-2 pt-2 border-t" style={{ borderColor: "var(--border-subtle)" }}>
            {Object.entries(agent.summary).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span>{k}</span>
                <span className="font-mono">{String(v)}</span>
              </div>
            ))}
          </div>
        )}
        {agent.errors.length > 0 && (
          <div className="mt-2 pt-2 border-t" style={{ borderColor: "var(--border-subtle)", color: "var(--destructive, #ef4444)" }}>
            {agent.errors.map((e, i) => (
              <div key={i} className="truncate">{e}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MonitoringPage() {
  const client = useGitHubClient();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHealth() {
      try {
        // 优先本地API
        const res = await fetch("/api/local-data?type=health");
        if (res.ok) {
          const data = await res.json();
          if (data.agents?.length > 0) { setHealth(data); return; }
        }
      } catch {}
      // 备用GitHub
      if (!client) return;
      try {
        const file = await client.getFile("execution", "_out/health-status.json");
        setHealth(JSON.parse(file.content));
      } catch (err: any) {
        if (err?.type === "not_found") setError("健康数据尚未生成");
        else setError(`获取失败：${err?.message || String(err)}`);
      }
    }
    fetchHealth().finally(() => setLoading(false));
  }, [client]);

  if (!client) {
    return (
      <div className="p-8 text-center" style={{ color: "var(--text-secondary)" }}>
        <AlertTriangle size={48} className="mx-auto mb-4 opacity-40" />
        <p>请先配置 GitHub Token 以查看 Agent 健康状态</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 text-center" style={{ color: "var(--text-secondary)" }}>
        <div className="animate-pulse">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center" style={{ color: "var(--text-secondary)" }}>
        <AlertTriangle size={48} className="mx-auto mb-4 opacity-40" />
        <p>{error}</p>
      </div>
    );
  }

  if (!health || health.agents.length === 0) {
    return (
      <div className="p-8 text-center" style={{ color: "var(--text-secondary)" }}>
        <Activity size={48} className="mx-auto mb-4 opacity-40" />
        <p>暂无 Agent 运行记录</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
          Agent 运行状态
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          更新于 {new Date(health.updatedAt).toLocaleString("zh-CN")}
          {" · "}
          <span className="text-green-500">{health.summary.healthy} 正常</span>
          {health.summary.failing > 0 && (
            <span className="text-red-500"> · {health.summary.failing} 异常</span>
          )}
        </p>
      </div>

      {/* Health bar */}
      <div className="mb-6 h-2 rounded-full overflow-hidden flex" style={{ background: "var(--surface-elevated)" }}>
        {health.summary.healthy > 0 && (
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${(health.summary.healthy / health.summary.total) * 100}%` }}
          />
        )}
        {health.summary.failing > 0 && (
          <div
            className="h-full bg-red-500 transition-all"
            style={{ width: `${(health.summary.failing / health.summary.total) * 100}%` }}
          />
        )}
      </div>

      {/* Agent cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {health.agents.map((agent) => (
          <AgentCard key={agent.agent} agent={agent} />
        ))}
      </div>
    </div>
  );
}
