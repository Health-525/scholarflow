"use client";

import { useState, useEffect, useMemo } from "react";
import { TrendingUp, BookOpen, Code2, FlaskConical, Languages, Wrench, Target, CheckCircle2, Clock, Flame } from "lucide-react";

interface ProgressEntry {
  date: string;
  subject: string;
  type: "note" | "code" | "exercise" | "reading" | "review";
  title: string;
  duration?: number;
}

interface SubjectProgress {
  subject: string;
  totalMinutes: number;
  entries: number;
  streak: number;
  lastActive: string;
}

const TYPE_META = {
  note:     { label: "笔记", icon: BookOpen,     color: "#2a4494", bg: "rgba(42,68,148,0.08)" },
  code:     { label: "代码", icon: Code2,        color: "#16a34a", bg: "rgba(22,163,74,0.08)" },
  exercise: { label: "练习", icon: FlaskConical,  color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
  reading:  { label: "阅读", icon: Languages,    color: "#8b5cf6", bg: "rgba(139,92,246,0.08)" },
  review:   { label: "复习", icon: Wrench,       color: "#06b6d4", bg: "rgba(6,182,212,0.08)" },
};

const DEMO_ENTRIES: ProgressEntry[] = [
  { date: "2026-06-11", subject: "数值分析", type: "note", title: "特征值分解推导", duration: 45 },
  { date: "2026-06-11", subject: "Python数据分析", type: "code", title: "PCA实现", duration: 60 },
  { date: "2026-06-10", subject: "多元统计分析", type: "exercise", title: "回归分析习题", duration: 30 },
  { date: "2026-06-10", subject: "大数据技术", type: "note", title: "MapReduce原理", duration: 40 },
  { date: "2026-06-09", subject: "数值分析", type: "review", title: "第三章复习", duration: 25 },
  { date: "2026-06-09", subject: "数据结构", type: "code", title: "排序算法实现", duration: 50 },
  { date: "2026-06-08", subject: "英语", type: "reading", title: "论文阅读", duration: 35 },
  { date: "2026-06-08", subject: "数学模型", type: "exercise", title: "优化模型练习", duration: 45 },
  { date: "2026-06-07", subject: "Python数据分析", type: "note", title: "数据清洗笔记", duration: 30 },
  { date: "2026-06-07", subject: "数值分析", type: "code", title: "数值积分实验", duration: 55 },
  { date: "2026-06-06", subject: "多元统计分析", type: "review", title: "方差分析复习", duration: 20 },
  { date: "2026-06-06", subject: "大数据技术", type: "exercise", title: "Spark实验", duration: 40 },
  { date: "2026-06-05", subject: "数据结构", type: "note", title: "树与图笔记", duration: 35 },
  { date: "2026-06-05", subject: "英语", type: "reading", title: "技术文档阅读", duration: 25 },
  { date: "2026-06-04", subject: "数学模型", type: "code", title: "线性规划求解", duration: 50 },
  { date: "2026-06-04", subject: "数值分析", type: "exercise", title: "插值法习题", duration: 30 },
  { date: "2026-06-03", subject: "Python数据分析", type: "review", title: "Pandas复习", duration: 20 },
  { date: "2026-06-03", subject: "多元统计分析", type: "note", title: "主成分分析笔记", duration: 40 },
  { date: "2026-06-02", subject: "大数据技术", type: "code", title: "Hadoop实验", duration: 45 },
  { date: "2026-06-02", subject: "数据结构", type: "exercise", title: "链表习题", duration: 25 },
  { date: "2026-06-01", subject: "数值分析", type: "reading", title: "教材阅读", duration: 30 },
  { date: "2026-06-01", subject: "数学模型", type: "note", title: "微分方程模型", duration: 35 },
];

export default function ProgressPage() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [entries] = useState<ProgressEntry[]>(DEMO_ENTRIES);
  const [filterSubject, setFilterSubject] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setIsDark(
      document.documentElement.getAttribute("data-theme") === "dark"
      || (document.documentElement.getAttribute("data-theme") !== "light"
          && window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
  }, []);

  const subjectProgress = useMemo(() => {
    const subjectMap: Record<string, SubjectProgress> = {};
    const sortedEntries = [...entries].sort((a, b) => b.date.localeCompare(a.date));
    sortedEntries.forEach(e => {
      if (!subjectMap[e.subject]) {
        subjectMap[e.subject] = { subject: e.subject, totalMinutes: 0, entries: 0, streak: 0, lastActive: e.date };
      }
      subjectMap[e.subject].totalMinutes += e.duration || 0;
      subjectMap[e.subject].entries++;
    });
    return Object.values(subjectMap).sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
    return filterSubject ? sorted.filter(e => e.subject === filterSubject) : sorted;
  }, [entries, filterSubject]);

  const totalMinutes = entries.reduce((s, e) => s + (e.duration || 0), 0);
  const totalHours = Math.round(totalMinutes / 60);
  const activeDays = new Set(entries.map(e => e.date)).size;
  const avgMinutesPerDay = activeDays > 0 ? Math.round(totalMinutes / activeDays) : 0;

  if (!mounted) {
    return (
      <div className="max-w-5xl mx-auto py-6 animate-page">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[1,2,3,4].map(i => <div key={i} className="rounded-2xl p-4 bg-card border border-border skeleton h-24" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6 animate-page">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-primary/10">
          <TrendingUp className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold font-display text-foreground">学习进度</h1>
          <p className="text-[12px] text-muted-foreground">追踪每日学习投入与知识积累</p>
        </div>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="rounded-2xl p-4 bg-card border border-primary/20 shadow-sm animate-fade-up stagger-1">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-semibold text-muted-foreground">总投入</span>
          </div>
          <div className="text-2xl font-bold tabular-nums text-primary animate-count">{totalHours}h</div>
          <div className="text-[10px] text-muted-foreground">{totalMinutes} 分钟</div>
        </div>
        <div className="rounded-2xl p-4 bg-card border border-green-500/20 shadow-sm animate-fade-up stagger-2">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            <span className="text-[10px] font-semibold text-muted-foreground">活跃天数</span>
          </div>
          <div className="text-2xl font-bold tabular-nums text-green-500 animate-count">{activeDays}</div>
          <div className="text-[10px] text-muted-foreground">近 {entries.length} 条记录</div>
        </div>
        <div className="rounded-2xl p-4 bg-card border border-amber-500/20 shadow-sm animate-fade-up stagger-3">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[10px] font-semibold text-muted-foreground">日均投入</span>
          </div>
          <div className="text-2xl font-bold tabular-nums text-amber-500 animate-count">{avgMinutesPerDay}m</div>
          <div className="text-[10px] text-muted-foreground">分钟/天</div>
        </div>
        <div className="rounded-2xl p-4 bg-card border border-border shadow-sm animate-fade-up stagger-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] font-semibold text-muted-foreground">学科覆盖</span>
          </div>
          <div className="text-2xl font-bold tabular-nums text-foreground animate-count">{subjectProgress.length}</div>
          <div className="text-[10px] text-muted-foreground">门课程</div>
        </div>
      </div>

      {/* Subject filter */}
      <div className="flex flex-wrap gap-2 mb-6 animate-fade-up stagger-5">
        <button
          onClick={() => setFilterSubject(null)}
          className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
            !filterSubject ? "bg-primary/10 text-primary border border-primary/20" : "bg-secondary text-muted-foreground border border-transparent hover:text-foreground"
          }`}
        >
          全部
        </button>
        {subjectProgress.map(s => (
          <button
            key={s.subject}
            onClick={() => setFilterSubject(s.subject === filterSubject ? null : s.subject)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
              filterSubject === s.subject ? "bg-primary/10 text-primary border border-primary/20" : "bg-secondary text-muted-foreground border border-transparent hover:text-foreground"
            }`}
          >
            {s.subject} · {s.totalMinutes}m
          </button>
        ))}
      </div>

      {/* Subject progress bars */}
      <div className="rounded-2xl p-5 bg-card border border-border shadow-sm mb-6 animate-fade-up stagger-6">
        <h2 className="text-[13px] font-semibold mb-4 text-foreground">学科投入分布</h2>
        <div className="space-y-3">
          {subjectProgress.map(s => {
            const maxMinutes = Math.max(...subjectProgress.map(sp => sp.totalMinutes));
            const pct = maxMinutes > 0 ? (s.totalMinutes / maxMinutes) * 100 : 0;
            return (
              <div key={s.subject} className="flex items-center gap-3">
                <span className="text-[12px] font-medium w-[80px] truncate text-foreground">{s.subject}</span>
                <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[11px] font-mono tabular-nums shrink-0 text-muted-foreground">{s.totalMinutes}m</span>
                <span className="text-[10px] shrink-0 text-muted-foreground">{s.entries}条</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent entries */}
      <div className="rounded-2xl p-5 bg-card border border-border shadow-sm animate-fade-up stagger-7">
        <h2 className="text-[13px] font-semibold mb-4 text-foreground">最近记录</h2>
        <div className="space-y-2">
          {filteredEntries.slice(0, 15).map((e, i) => {
            const meta = TYPE_META[e.type];
            return (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/30 transition-colors animate-fade-up" style={{ animationDelay: `${i * 0.03}s` }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: meta.bg }}>
                  <meta.icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-medium truncate text-foreground">{e.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0" style={{ backgroundColor: meta.bg, color: meta.color }}>
                      {meta.label}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{e.subject}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] tabular-nums text-muted-foreground">{e.duration ? `${e.duration}m` : "--"}</div>
                  <div className="text-[10px] text-muted-foreground">{e.date}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}