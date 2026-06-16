"use client";

import { TrendingUp, BookOpen, Code2, FlaskConical, Languages, Wrench, Target, CheckCircle2, Clock, Flame, Plus } from "lucide-react";
import { useState, useEffect, useMemo } from "react";

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

const TYPE_KEYS = Object.keys(TYPE_META) as ProgressEntry["type"][];

const todayStr = () => new Date().toISOString().split("T")[0];

export default function ProgressPage() {
  const [mounted, setMounted] = useState(false);
  const [_isDark, setIsDark] = useState(false);
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [filterSubject, setFilterSubject] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProgressEntry>({
    date: todayStr(),
    subject: "",
    type: "note",
    title: "",
    duration: undefined,
  });

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

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.title.trim()) return;
    setEntries(prev => [...prev, { ...form, subject: form.subject.trim(), title: form.title.trim() }]);
    setForm({ date: todayStr(), subject: "", type: "note", title: "", duration: undefined });
    setShowForm(false);
  };

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

      {/* Empty state */}
      {entries.length === 0 && (
        <div className="rounded-2xl p-8 bg-card border border-border shadow-sm mb-6 animate-fade-up stagger-5 text-center">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-[15px] font-semibold text-foreground mb-1">暂无学习进度</h2>
          <p className="text-[12px] text-muted-foreground mb-4">记录第一条学习记录，开始追踪你的成长。</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新增记录
          </button>
        </div>
      )}

      {/* Add entry form */}
      {showForm && (
        <form onSubmit={handleAdd} className="rounded-2xl p-5 bg-card border border-border shadow-sm mb-6 animate-fade-up stagger-5">
          <h2 className="text-[13px] font-semibold mb-4 text-foreground">新增学习记录</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label htmlFor="progress-date" className="block text-[11px] font-medium text-muted-foreground mb-1">日期</label>
              <input
                id="progress-date"
                type="date"
                required
                value={form.date}
                onChange={ev => setForm(f => ({ ...f, date: ev.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-[12px] text-foreground outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label htmlFor="progress-subject" className="block text-[11px] font-medium text-muted-foreground mb-1">学科</label>
              <input
                id="progress-subject"
                type="text"
                required
                placeholder="例如：数值分析"
                value={form.subject}
                onChange={ev => setForm(f => ({ ...f, subject: ev.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-[12px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60"
              />
            </div>
            <div>
              <label htmlFor="progress-type" className="block text-[11px] font-medium text-muted-foreground mb-1">类型</label>
              <select
                id="progress-type"
                value={form.type}
                onChange={ev => setForm(f => ({ ...f, type: ev.target.value as ProgressEntry["type"] }))}
                className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-[12px] text-foreground outline-none focus:ring-2 focus:ring-primary/20"
              >
                {TYPE_KEYS.map(t => (
                  <option key={t} value={t}>{TYPE_META[t].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="progress-duration" className="block text-[11px] font-medium text-muted-foreground mb-1">时长（分钟）</label>
              <input
                id="progress-duration"
                type="number"
                min={0}
                placeholder="可选"
                value={form.duration ?? ""}
                onChange={ev => setForm(f => ({ ...f, duration: ev.target.value ? Number(ev.target.value) : undefined }))}
                className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-[12px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="progress-title" className="block text-[11px] font-medium text-muted-foreground mb-1">标题</label>
              <input
                id="progress-title"
                type="text"
                required
                placeholder="例如：特征值分解推导"
                value={form.title}
                onChange={ev => setForm(f => ({ ...f, title: ev.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-[12px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl bg-secondary text-muted-foreground text-[12px] font-medium hover:text-foreground transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 transition-colors"
            >
              保存
            </button>
          </div>
        </form>
      )}

      {/* Subject filter */}
      {entries.length > 0 && (
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
      )}

      {/* Subject progress bars */}
      {entries.length > 0 && (
        <div className="rounded-2xl p-5 bg-card border border-border shadow-sm mb-6 animate-fade-up stagger-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13px] font-semibold text-foreground">学科投入分布</h2>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/20 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              新增记录
            </button>
          </div>
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
      )}

      {/* Recent entries */}
      {entries.length > 0 && (
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
      )}
    </div>
  );
}
