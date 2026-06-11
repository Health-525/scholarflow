"use client";

import { useState, useMemo, useEffect } from "react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer,
} from "recharts";
import { Brain, Code2, FlaskConical, Languages, Wrench, TrendingUp, AlertTriangle, Sparkles } from "lucide-react";

// ── Types ──────────────────────────────────────────────────
interface SkillData {
  name: string;
  level: number; // 0-100
  category: "brain" | "code" | "flask" | "languages" | "wrench";
}

// ── Static data (extracted from _meta/知识画像.md) ─────────
const STATIC_SKILLS: SkillData[] = [
  { name: "Python", level: 90, category: "code" },
  { name: "JavaScript/TS", level: 78, category: "code" },
  { name: "R/MATLAB", level: 72, category: "flask" },
  { name: "多元统计分析", level: 80, category: "brain" },
  { name: "数值分析", level: 78, category: "brain" },
  { name: "大数据技术", level: 68, category: "wrench" },
  { name: "数据结构", level: 62, category: "wrench" },
  { name: "AI/ML理论", level: 35, category: "brain" },
  { name: "深度学习框架", level: 25, category: "code" },
  { name: "Rust", level: 10, category: "code" },
  { name: "Git/CI自动化", level: 85, category: "wrench" },
  { name: "技术英语", level: 88, category: "languages" },
  { name: "LLM工具链", level: 82, category: "brain" },
  { name: "数学建模", level: 70, category: "flask" },
];

const CATEGORY_META: Record<string, { label: string; Icon: typeof Brain; color: string; bg: string }> = {
  brain:     { label: "理论思维", Icon: Brain,       color: "#2a4494", bg: "rgba(42,68,148,0.08)" },
  code:      { label: "编程开发", Icon: Code2,       color: "#16a34a", bg: "rgba(22,163,74,0.08)" },
  flask:     { label: "实验建模", Icon: FlaskConical, color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
  languages: { label: "语言能力", Icon: Languages,   color: "#8b5cf6", bg: "rgba(139,92,246,0.08)" },
  wrench:    { label: "工程工具", Icon: Wrench,      color: "#06b6d4", bg: "rgba(6,182,212,0.08)" },
};

const GAP_TYPES = [
  { type: "桥接型", desc: "已学A+B → 缺少A→B的连接推导", icon: "🔗", color: "#2a4494" },
  { type: "深度不足", desc: "会用工具 → 缺少从零实现的能力", icon: "🔬", color: "#f59e0b" },
  { type: "缺失模块", desc: "知识图谱中完全空白区域", icon: "🕳️", color: "#ef4444" },
  { type: "兴趣信号", desc: "频繁提及但未系统学习", icon: "💡", color: "#8b5cf6" },
];

// ── Helpers ────────────────────────────────────────────────
// Use static colors for SSR safety — no document access
const CHART_COLORS_LIGHT = {
  primary: "#2a4494",
  border: "rgba(26,21,16,0.10)",
  mutedFg: "rgba(26,21,16,0.45)",
  cardBg: "#fffdf9",
  foreground: "#1a1510",
};
const CHART_COLORS_DARK = {
  primary: "#6b8ed6",
  border: "rgba(240,235,227,0.10)",
  mutedFg: "rgba(240,235,227,0.45)",
  cardBg: "#1c1916",
  foreground: "#f0ebe3",
};

const levelColor = (level: number) =>
  level >= 80 ? "#22c55e" :
  level >= 60 ? "#f59e0b" :
  level >= 30 ? "#f97316" : "#ef4444";

const levelLabel = (level: number) =>
  level >= 80 ? "精通" :
  level >= 60 ? "熟练" :
  level >= 30 ? "入门" : "空白";

// ── Main Page ──────────────────────────────────────────────
export default function KnowledgeProfilePage() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(
      document.documentElement.getAttribute("data-theme") === "dark"
      || (document.documentElement.getAttribute("data-theme") !== "light"
          && window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
    setMounted(true);
  }, []);

  const skills = STATIC_SKILLS;
  const colors = isDark ? CHART_COLORS_DARK : CHART_COLORS_LIGHT;

  const avgLevel = Math.round(skills.reduce((s, sk) => s + sk.level, 0) / skills.length);
  const strengths = skills.filter(s => s.level >= 75);
  const gaps = skills.filter(s => s.level < 50);

  // Group by category
  const grouped = useMemo(() => {
    const map: Record<string, SkillData[]> = {};
    for (const s of skills) {
      if (!map[s.category]) map[s.category] = [];
      map[s.category].push(s);
    }
    return map;
  }, []);

  // Radar chart data — use top skills per category for readability
  const radarData = useMemo(() => {
    const picks = [
      skills.find(s => s.name === "Python")!,
      skills.find(s => s.name === "多元统计分析")!,
      skills.find(s => s.name === "技术英语")!,
      skills.find(s => s.name === "Git/CI自动化")!,
      skills.find(s => s.name === "LLM工具链")!,
      skills.find(s => s.name === "数值分析")!,
      skills.find(s => s.name === "JavaScript/TS")!,
      skills.find(s => s.name === "数学建模")!,
    ];
    return picks.map(s => ({ subject: s.name, level: s.level, fullMark: 100 }));
  }, []);

  // Simulated knowledge gaps (from 知识画像.md analysis)
  const knowledgeGaps = [
    { type: "桥接型", title: "协方差矩阵→特征值→主成分", detail: "已学特征值分解 + 已学PCA调用，缺少完整推导", priority: 1 },
    { type: "深度不足", title: "神经网络训练循环", detail: "会用numpy/sklearn，缺少从零实现训练循环", priority: 2 },
    { type: "缺失模块", title: "Transformer注意力机制", detail: "AI学习目录几乎为空，建议从注意力机制开始", priority: 1 },
    { type: "兴趣信号", title: "MCP协议规范", detail: "多次提到MCP但未系统学习协议规范", priority: 3 },
  ];

  // SSR-safe: don't render chart until mounted
  if (!mounted) {
    return (
      <div className="max-w-5xl mx-auto py-6 animate-page">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-primary/10">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">知识画像</h1>
            <p className="text-[12px] text-muted-foreground">综合水平 {avgLevel}% · 优势 {strengths.length} 项 · 空白 {gaps.length} 项</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="rounded-2xl p-4 bg-card border border-border skeleton h-24" />
          ))}
        </div>
        <div className="rounded-2xl p-5 bg-card border border-border skeleton h-64 mb-6" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6 animate-page">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-primary/10">
          <Brain className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold font-display text-foreground">知识画像</h1>
          <p className="text-[12px] text-muted-foreground">
            综合水平 {avgLevel}% · 优势 {strengths.length} 项 · 空白 {gaps.length} 项
          </p>
        </div>
      </div>

      {/* Bento Grid: Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="rounded-2xl p-4 bg-card border border-green-500/20 shadow-sm animate-fade-up stagger-1">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-green-500" />
            <span className="text-[10px] font-semibold text-muted-foreground">优势领域</span>
          </div>
          <div className="text-2xl font-bold tabular-nums text-green-500 animate-count">{strengths.length}</div>
          <div className="text-[10px] text-muted-foreground">≥75% 熟练度</div>
        </div>
        <div className="rounded-2xl p-4 bg-card border border-primary/20 shadow-sm animate-fade-up stagger-2">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-semibold text-muted-foreground">综合水平</span>
          </div>
          <div className="text-2xl font-bold tabular-nums text-primary animate-count">{avgLevel}%</div>
          <div className="text-[10px] text-muted-foreground">14项技能均值</div>
        </div>
        <div className="rounded-2xl p-4 bg-card border border-red-500/20 shadow-sm animate-fade-up stagger-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            <span className="text-[10px] font-semibold text-muted-foreground">知识空白</span>
          </div>
          <div className="text-2xl font-bold tabular-nums text-red-500 animate-count">{gaps.length}</div>
          <div className="text-[10px] text-muted-foreground">&lt;50% 需加强</div>
        </div>
        <div className="rounded-2xl p-4 bg-card border border-border shadow-sm animate-fade-up stagger-4">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] font-semibold text-muted-foreground">技能总数</span>
          </div>
          <div className="text-2xl font-bold tabular-nums text-foreground animate-count">{skills.length}</div>
          <div className="text-[10px] text-muted-foreground">5大类别</div>
        </div>
      </div>

      {/* Radar Chart + Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Radar Chart */}
        <div className="rounded-2xl p-5 bg-card border border-border shadow-sm animate-fade-up stagger-5">
          <h2 className="text-[13px] font-semibold mb-3 text-foreground">技能雷达图</h2>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
              <PolarGrid stroke={colors.border} />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fontSize: 11, fill: colors.mutedFg }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fontSize: 9, fill: colors.mutedFg }}
                tickCount={4}
              />
              <Radar
                name="技能水平"
                dataKey="level"
                stroke={colors.primary}
                fill={colors.primary}
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Category breakdown */}
        <div className="space-y-3 animate-fade-up stagger-6">
          {Object.entries(grouped).map(([cat, catSkills]) => {
            const meta = CATEGORY_META[cat];
            const catAvg = Math.round(catSkills.reduce((s, sk) => s + sk.level, 0) / catSkills.length);
            return (
              <div
                key={cat}
                className="rounded-2xl p-4 bg-card border border-border shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: meta.bg }}>
                      <meta.Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
                    </div>
                    <span className="text-[13px] font-semibold text-foreground">{meta.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[18px] font-bold tabular-nums" style={{ color: meta.color }}>{catAvg}%</span>
                    <span className="text-[10px] text-muted-foreground">均值</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {catSkills.map(skill => (
                    <div key={skill.name} className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground w-[100px] truncate">{skill.name}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${skill.level}%`, backgroundColor: levelColor(skill.level) }}
                        />
                      </div>
                      <span className="text-[10px] font-mono tabular-nums shrink-0" style={{ color: levelColor(skill.level) }}>
                        {skill.level}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Knowledge Gap Diagnostics */}
      <div className="rounded-2xl p-5 bg-card border border-border shadow-sm animate-fade-up stagger-7 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <h2 className="text-[13px] font-semibold text-foreground">知识空白诊断</h2>
          <span className="sf-chip sf-chip-error">{knowledgeGaps.length} 项</span>
        </div>

        {/* Gap type legend */}
        <div className="flex flex-wrap gap-2 mb-4">
          {GAP_TYPES.map(gt => (
            <div key={gt.type} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-secondary">
              <span className="text-[12px]">{gt.icon}</span>
              <span className="text-[10px] font-medium" style={{ color: gt.color }}>{gt.type}</span>
            </div>
          ))}
        </div>

        {/* Gap cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {knowledgeGaps.map((gap, i) => {
            const gapMeta = GAP_TYPES.find(gt => gt.type === gap.type)!;
            const priorityColor = gap.priority === 1 ? "#ef4444" : gap.priority === 2 ? "#f59e0b" : "#06b6d4";
            return (
              <div
                key={i}
                className="rounded-xl p-4 border bg-card animate-fade-up"
                style={{
                  borderColor: `${gapMeta.color}20`,
                  borderLeftWidth: 3,
                  borderLeftColor: gapMeta.color,
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px]">{gapMeta.icon}</span>
                    <span className="text-[12px] font-semibold text-foreground">{gap.title}</span>
                  </div>
                  <span
                    className="shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold"
                    style={{
                      backgroundColor: `${priorityColor}15`,
                      color: priorityColor,
                    }}
                  >
                    P{gap.priority}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">{gap.detail}</p>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: `${gapMeta.color}10`, color: gapMeta.color }}>
                    {gap.type}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full Skill Bars */}
      <div className="rounded-2xl p-5 bg-card border border-border shadow-sm animate-fade-up stagger-8">
        <h2 className="text-[13px] font-semibold mb-4 text-foreground">技术栈全景</h2>
        <div className="space-y-3">
          {skills.map((skill, i) => {
            const meta = CATEGORY_META[skill.category];
            return (
              <div key={skill.name} className="flex items-center gap-3 animate-fade-up" style={{ animationDelay: `${i * 0.03}s` }}>
                <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: meta.bg }}>
                  <meta.Icon className="w-3 h-3" style={{ color: meta.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-[12px] mb-1">
                    <span className="truncate text-foreground font-medium">{skill.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: `${levelColor(skill.level)}10`, color: levelColor(skill.level) }}>
                        {levelLabel(skill.level)}
                      </span>
                      <span className="font-mono text-[11px] tabular-nums" style={{ color: levelColor(skill.level) }}>
                        {skill.level}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${skill.level}%`, backgroundColor: levelColor(skill.level) }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}