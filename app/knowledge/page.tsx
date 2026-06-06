"use client";

import { useEffect, useState } from "react";
import { useGitHubClient } from "@/hooks/useGitHubClient";
import { Brain, BookOpen, Code2, FlaskConical, Languages, Wrench } from "lucide-react";

interface SkillData {
  name: string;
  level: number; // 0-100
  icon: string;
}

// 知识画像提取自 _meta/知识画像.md，硬编码作为静态备用
const STATIC_SKILLS: SkillData[] = [
  { name: "Python", level: 90, icon: "code" },
  { name: "JavaScript/TS", level: 78, icon: "code" },
  { name: "R/MATLAB", level: 72, icon: "flask" },
  { name: "多元统计分析", level: 80, icon: "brain" },
  { name: "数值分析", level: 78, icon: "brain" },
  { name: "大数据技术", level: 68, icon: "wrench" },
  { name: "数据结构", level: 62, icon: "wrench" },
  { name: "AI/ML理论", level: 35, icon: "brain" },
  { name: "深度学习框架", level: 25, icon: "code" },
  { name: "Rust", level: 10, icon: "code" },
  { name: "Git/CI自动化", level: 85, icon: "wrench" },
  { name: "技术英语", level: 88, icon: "languages" },
  { name: "LLM工具链", level: 82, icon: "brain" },
  { name: "数学建模", level: 70, icon: "flask" },
];

function SkillBar({ skill }: { skill: SkillData }) {
  const IconComp =
    skill.icon === "brain" ? Brain :
    skill.icon === "code" ? Code2 :
    skill.icon === "flask" ? FlaskConical :
    skill.icon === "languages" ? Languages : Wrench;

  const color =
    skill.level >= 80 ? "#22c55e" :
    skill.level >= 60 ? "#f59e0b" :
    skill.level >= 30 ? "#f97316" : "#ef4444";

  return (
    <div className="flex items-center gap-3 py-2">
      <IconComp size={18} style={{ color, opacity: 0.7 }} />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-sm mb-0.5">
          <span className="truncate" style={{ color: "var(--text-primary)" }}>{skill.name}</span>
          <span className="font-mono text-xs" style={{ color }}>{skill.level}%</span>
        </div>
        <div className="h-1.5 rounded-full" style={{ background: "var(--surface-elevated)" }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${skill.level}%`, background: color }} />
        </div>
      </div>
    </div>
  );
}

export default function KnowledgeProfilePage() {
  const [skills] = useState<SkillData[]>(STATIC_SKILLS);

  const avgLevel = Math.round(skills.reduce((s, sk) => s + sk.level, 0) / skills.length);
  const strengths = skills.filter(s => s.level >= 75);
  const gaps = skills.filter(s => s.level < 50);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
          知识画像
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          综合水平 {avgLevel}% · 优势领域 {strengths.length} 项 · 待提升 {gaps.length} 项
        </p>
      </div>

      {/* Overall level */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="rounded-xl p-4 text-center" style={{ background: "var(--surface)", border: "1px solid rgba(34,197,94,0.2)" }}>
          <div className="text-3xl font-bold text-green-500">{strengths.length}</div>
          <div className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>优势领域 (≥75%)</div>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: "var(--surface)", border: "1px solid rgba(59,130,246,0.2)" }}>
          <div className="text-3xl font-bold" style={{ color: "var(--accent)" }}>{avgLevel}%</div>
          <div className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>综合水平</div>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: "var(--surface)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <div className="text-3xl font-bold text-red-500">{gaps.length}</div>
          <div className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>待提升 (&lt;50%)</div>
        </div>
      </div>

      {/* Skill bars */}
      <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border-subtle)" }}>
        <h2 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>技术栈全景</h2>
        {skills.map(skill => (
          <SkillBar key={skill.name} skill={skill} />
        ))}
      </div>
    </div>
  );
}
