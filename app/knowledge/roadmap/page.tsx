"use client";

import { useEffect, useState } from "react";
import { useGitHubClient } from "@/hooks/useGitHubClient";
import { BookOpen, Clock, TrendingUp, CheckCircle2, ChevronRight, Lightbulb } from "lucide-react";

interface Topic {
  id: string;
  title: string;
  priority: number;
  readiness: number;
  effort: { hours: number; label: string };
  why: string;
  prerequisites: string[];
  relatedCourses: string[];
}

interface Phase {
  phase: number;
  name: string;
  topics: Topic[];
  totalHours: number;
}

interface RoadmapData {
  updatedAt: string;
  overview: {
    totalGaps: number;
    completed: number;
    remaining: number;
    totalHours: number;
  };
  phases: Phase[];
}

const PRIORITY_COLORS: Record<number, string> = {
  1: "#ef4444",
  2: "#f59e0b",
  3: "#3b82f6",
};

export default function KnowledgeRoadmapPage() {
  const client = useGitHubClient();
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/local-data?type=roadmap");
        if (res.ok) {
          const data = await res.json();
          if (data.phases?.length > 0) { setRoadmap(data); return; }
        }
      } catch {}
      if (!client) return;
      try {
        const file = await client.getFile("execution", "_out/knowledge-roadmap.json");
        setRoadmap(JSON.parse(file.content));
      } catch (err: any) {
        if (err?.type === "not_found") setError("知识路线图尚未生成");
        else setError(`获取失败：${err?.message || String(err)}`);
      }
    }
    fetchData().finally(() => setLoading(false));
  }, [client]);

  if (!client) {
    return <EmptyState icon={BookOpen} text="请先配置 GitHub Token" />;
  }

  if (loading) {
    return <div className="p-8 text-center animate-pulse text-muted-foreground">加载中...</div>;
  }

  if (error) {
    return <EmptyState icon={Lightbulb} text={error} />;
  }

  if (!roadmap || roadmap.phases.length === 0) {
    return <EmptyState icon={CheckCircle2} text="所有知识空白已填补 🎉" />;
  }

  return (
    <div className="max-w-5xl mx-auto py-6 animate-page">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-primary/10">
          <BookOpen className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold font-display text-foreground">知识学习路线图</h1>
          <p className="text-[12px] text-muted-foreground">更新于 {new Date(roadmap.updatedAt).toLocaleString("zh-CN")}</p>
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard icon={BookOpen} label="总空白" value={roadmap.overview.totalGaps} />
        <StatCard icon={CheckCircle2} label="已填补" value={roadmap.overview.completed} color="#22c55e" />
        <StatCard icon={TrendingUp} label="待学习" value={roadmap.overview.remaining} color="#2a4494" />
        <StatCard icon={Clock} label="预计耗时" value={`${roadmap.overview.totalHours}h`} color="#f59e0b" />
      </div>

      {/* Progress bar */}
      <div className="mb-8 h-2 rounded-full overflow-hidden flex bg-secondary">
        {roadmap.overview.completed > 0 && (
          <div className="h-full bg-green-500" style={{ width: `${(roadmap.overview.completed / roadmap.overview.totalGaps) * 100}%` }} />
        )}
      </div>

      {/* Phases */}
      {roadmap.phases.map((phase) => (
        <div key={phase.phase} className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold text-primary-foreground bg-primary">
              {phase.phase}
            </span>
            <h2 className="text-lg font-semibold text-foreground">{phase.name}</h2>
            <span className="text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground">
              {phase.totalHours}h
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-11">
            {phase.topics.map((topic) => (
              <div
                key={topic.id}
                className="rounded-xl p-4 border bg-card border-border"
                style={{ borderLeftWidth: 3, borderLeftColor: PRIORITY_COLORS[topic.priority] || "#2a4494" }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-sm leading-snug text-foreground">{topic.title}</h3>
                  <span className="shrink-0 text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      background: `${PRIORITY_COLORS[topic.priority]}20`,
                      color: PRIORITY_COLORS[topic.priority],
                    }}>
                    {topic.effort.label} · {topic.effort.hours}h
                  </span>
                </div>

                <p className="text-xs mb-3 leading-relaxed text-muted-foreground">
                  {topic.why.length > 120 ? topic.why.slice(0, 120) + "..." : topic.why}
                </p>

                {/* Readiness bar */}
                <div className="mb-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">准备度</span>
                    <span className="text-muted-foreground">{topic.readiness}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${topic.readiness}%`,
                        background: topic.readiness >= 70 ? "#22c55e" : topic.readiness >= 40 ? "#f59e0b" : "#ef4444",
                      }}
                    />
                  </div>
                </div>

                {topic.prerequisites.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {topic.prerequisites.map((p, i) => (
                      <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{p}</span>
                    ))}
                  </div>
                )}

                {topic.relatedCourses.length > 0 && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <ChevronRight size={10} />
                    {topic.relatedCourses.join(" · ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="rounded-xl p-4 text-center bg-card border border-border">
      <div className={`mx-auto mb-1 opacity-50 ${color ? "" : "text-muted-foreground"}`} style={color ? { color } : undefined}>
        <Icon size={20} />
      </div>
      <div className={`text-2xl font-bold ${color ? "" : "text-foreground"}`} style={color ? { color } : undefined}>{value}</div>
      <div className="text-xs mt-0.5 text-muted-foreground">{label}</div>
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: React.ComponentType<{ size?: number }>; text: string }) {
  return (
    <div className="p-8 text-center text-muted-foreground">
      <div className="mx-auto mb-4 opacity-40"><Icon size={48} /></div>
      <p>{text}</p>
    </div>
  );
}
