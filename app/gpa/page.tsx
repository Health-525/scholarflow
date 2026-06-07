"use client";

import { useState, useEffect, useMemo } from "react";
import { TrendingUp, BookOpen, ChevronDown, Filter } from "lucide-react";
import {
  scoreToGPA, gpaColor, getScoreBadgeStyle, getScoreDisplay, getSemesterLabel,
} from "@/lib/gpa";
import { GPARing } from "@/components/ui/GPARing";

interface JwglCourse {
  course: string;
  score: string;
  credit: string;
  type: string;
  semester: string;
}

interface JwglGrades {
  gpa: string;
  totalCredits: number;
  requiredCourses: number;
  allCourses: JwglCourse[];
}

function groupBySemester(courses: JwglCourse[]): Record<string, JwglCourse[]> {
  const groups: Record<string, JwglCourse[]> = {};
  for (const c of courses) {
    if (!groups[c.semester]) groups[c.semester] = [];
    groups[c.semester].push(c);
  }
  const sorted = Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  const result: Record<string, JwglCourse[]> = {};
  for (const [k, v] of sorted) result[k] = v;
  return result;
}

function calcGPA(courses: JwglCourse[]): number {
  let totalPoints = 0, totalCredits = 0;
  for (const c of courses) {
    const credit = parseFloat(c.credit) || 0;
    if (credit === 0) continue;
    const s = parseFloat(c.score);
    if (isNaN(s)) continue;
    totalPoints += scoreToGPA(s) * credit;
    totalCredits += credit;
  }
  return totalCredits > 0 ? Math.round((totalPoints / totalCredits) * 100) / 100 : 0;
}

function calcCredits(courses: JwglCourse[]): number {
  return courses.reduce((s, c) => s + (parseFloat(c.credit) || 0), 0);
}

const SCORE_RANGES = [
  { label: "优秀", sub: "≥90", min: 90, max: 101, color: "#22c55e" },
  { label: "良好", sub: "80-89", min: 80, max: 90, color: "#2a4494" },
  { label: "中等", sub: "70-79", min: 70, max: 80, color: "#f59e0b" },
  { label: "及格", sub: "60-69", min: 60, max: 70, color: "#f97316" },
  { label: "不及格", sub: "<60", min: 0, max: 60, color: "#ef4444" },
];

const GPA_REF = [
  { range: "≥90", gpa: "4.0", color: "#22c55e" },
  { range: "86-89", gpa: "3.7", color: "#22c55e" },
  { range: "82-85", gpa: "3.3", color: "#2a4494" },
  { range: "79-81", gpa: "3.0", color: "#2a4494" },
  { range: "75-78", gpa: "2.7", color: "#f59e0b" },
  { range: "71-74", gpa: "2.3", color: "#f59e0b" },
  { range: "68-70", gpa: "2.0", color: "#f97316" },
  { range: "60-67", gpa: "1.3", color: "#f97316" },
];

// ── 主页面 ──
export default function GPAPage() {
  const [grades, setGrades] = useState<JwglGrades | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSemester, setActiveSemester] = useState<string>("all");
  const [expandedSemesters, setExpandedSemesters] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/local-data?type=grades")
      .then(r => r.json())
      .then(d => { if (d?.allCourses?.length > 0) setGrades(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleSemester = (sem: string) => {
    setExpandedSemesters(prev => ({ ...prev, [sem]: !prev[sem] }));
  };

  const semesters = useMemo(() => grades ? groupBySemester(grades.allCourses) : {}, [grades]);
  const semesterKeys = useMemo(() => Object.keys(semesters), [semesters]);

  // 每学期 GPA 缓存
  const semesterGPAs = useMemo(() => {
    const map: Record<string, number> = {};
    for (const [sem, courses] of Object.entries(semesters)) {
      map[sem] = calcGPA(courses);
    }
    return map;
  }, [semesters]);

  const filteredCourses = useMemo(() => {
    if (!grades) return [];
    if (activeSemester === "all") return grades.allCourses;
    return semesters[activeSemester] || [];
  }, [grades, activeSemester, semesters]);

  const filteredGPA = useMemo(() => calcGPA(filteredCourses), [filteredCourses]);
  const filteredCredits = useMemo(() => calcCredits(filteredCourses), [filteredCourses]);
  const filteredRequired = useMemo(() => filteredCourses.filter(c => c.type === "必修").length, [filteredCourses]);
  const numeric = useMemo(() => filteredCourses.filter(c => !isNaN(parseFloat(c.score))), [filteredCourses]);
  const rangeCounts = useMemo(() =>
    SCORE_RANGES.map(r => numeric.filter(c => { const s = parseFloat(c.score); return s >= r.min && s < r.max; }).length),
  [numeric]);
  const maxCount = Math.max(...rangeCounts, 1);

  if (loading) {
    return (
      <div className="pb-24 md:pb-8 max-w-2xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <div className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>加载中...</div>
        </div>
      </div>
    );
  }

  if (!grades) {
    return (
      <div className="pb-24 md:pb-8 max-w-2xl mx-auto">
        <div className="mb-6 py-4">
          <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>绩点</h1>
        </div>
        <div className="rounded-2xl p-8 text-center" style={{ border: "1px solid var(--border)", backgroundColor: "var(--surface-card)" }}>
          <BookOpen className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
          <p className="text-[13px] mb-1" style={{ color: "var(--text-secondary)" }}>暂未同步教务系统成绩</p>
          <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>运行 timetable/scripts/fetch_grades_all.js 导入成绩</p>
        </div>
      </div>
    );
  }

  const currentGPAColor = gpaColor(filteredGPA);

  return (
    <div className="pb-24 md:pb-8 max-w-2xl mx-auto">
      <div className="mb-4 py-4">
        <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>绩点</h1>
        <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>数据来自教务系统</p>
      </div>

      {/* 学期筛选 */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2.5">
          <Filter className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
          <span className="text-[11px] font-medium" style={{ color: "var(--text-tertiary)" }}>学期筛选</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
          <button
            onClick={() => setActiveSemester("all")}
            className="shrink-0 px-3.5 py-1.5 rounded-xl text-[12px] font-medium transition-all"
            style={{
              backgroundColor: activeSemester === "all" ? "var(--accent)" : "var(--surface)",
              color: activeSemester === "all" ? "#fff" : "var(--text-secondary)",
              border: activeSemester === "all" ? "1px solid var(--accent)" : "1px solid var(--border)",
              boxShadow: activeSemester === "all" ? "0 2px 8px rgba(42,68,148,0.20)" : "none",
            }}
            aria-pressed={activeSemester === "all"}
          >
            全部
          </button>
          {semesterKeys.map(sem => {
            const isActive = activeSemester === sem;
            const semGPA = semesterGPAs[sem];
            return (
              <button
                key={sem}
                onClick={() => setActiveSemester(sem)}
                className="shrink-0 px-3.5 py-1.5 rounded-xl text-[12px] font-medium transition-all"
                style={{
                  backgroundColor: isActive ? "var(--accent)" : "var(--surface)",
                  color: isActive ? "#fff" : "var(--text-secondary)",
                  border: isActive ? "1px solid var(--accent)" : "1px solid var(--border)",
                  boxShadow: isActive ? "0 2px 8px rgba(42,68,148,0.20)" : "none",
                }}
                aria-pressed={isActive}
              >
                {getSemesterLabel(sem)}
                {semGPA > 0 && (
                  <span className="ml-1.5 text-[10px] font-semibold" style={{ color: isActive ? "rgba(255,255,255,0.75)" : gpaColor(semGPA) }}>
                    {semGPA.toFixed(1)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* GPA 主卡片 */}
      <div className="rounded-2xl p-6 mb-4 text-center relative overflow-hidden" style={{ background: "var(--surface-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
        <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 30%, ${currentGPAColor}15 0%, transparent 60%)` }} />
        <div className="relative flex flex-col items-center">
          <div className="relative">
            <GPARing value={filteredGPA} size={140} strokeWidth={10} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-[36px] font-bold tabular-nums leading-none" style={{ color: currentGPAColor }}>
                {filteredGPA > 0 ? filteredGPA.toFixed(2) : "--"}
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>GPA</div>
            </div>
          </div>
          <div className="flex items-center gap-0 mt-4 w-full max-w-[280px]">
            {[
              { value: filteredCredits, label: "学分" },
              { value: filteredCourses.length, label: "课程" },
              { value: filteredRequired, label: "必修" },
            ].map((item, i) => (
              <div key={i} className="flex-1 text-center" style={{ borderRight: i < 2 ? "1px solid var(--border)" : "none" }}>
                <div className="text-[18px] font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>{item.value}</div>
                <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 成绩分布 */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xs)" }}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4" style={{ color: "var(--accent)" }} />
          <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>成绩分布</span>
          <span className="text-[10px] ml-auto" style={{ color: "var(--text-tertiary)" }}>{numeric.length}门有分数</span>
        </div>
        <div className="space-y-3">
          {SCORE_RANGES.map((r, ri) => {
            const count = rangeCounts[ri];
            const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
            return (
              <div key={r.label}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
                    <span className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>{r.label}</span>
                    <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{r.sub}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>{count}</span>
                    <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>门</span>
                  </div>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface)" }}>
                  <div className="h-full rounded-full" style={{ width: `${barWidth}%`, backgroundColor: r.color, opacity: 0.85, transition: "width 0.6s ease", minWidth: count > 0 ? "6px" : "0" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 课程列表 */}
      <div className="mb-4">
        {activeSemester === "all" ? (
          <div className="space-y-3">
            {Object.entries(semesters).map(([sem, courses]) => {
              const semGPA = semesterGPAs[sem];
              const semGPAColor = gpaColor(semGPA);
              const expanded = expandedSemesters[sem] ?? false;
              const semCredits = calcCredits(courses);
              return (
                <div key={sem} className="rounded-2xl overflow-hidden" style={{ background: "var(--surface-card)", border: "1px solid var(--border)", boxShadow: expanded ? "var(--shadow-sm)" : "var(--shadow-xs)", transition: "box-shadow 0.2s" }}>
                  <button onClick={() => toggleSemester(sem)} className="w-full flex items-center justify-between p-4 text-left">
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold" style={{ color: "var(--text-primary)" }}>{getSemesterLabel(sem)}</div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>{courses.length}门</span>
                        <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>{semCredits}学分</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1.5 rounded-xl text-center" style={{ backgroundColor: `${semGPAColor}12` }}>
                        <div className="text-[18px] font-bold tabular-nums leading-none" style={{ color: semGPAColor }}>{semGPA > 0 ? semGPA.toFixed(2) : "--"}</div>
                      </div>
                      <ChevronDown className="w-4 h-4 shrink-0 transition-transform duration-200" style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)", color: "var(--text-muted)" }} />
                    </div>
                  </button>
                  {expanded && <div className="px-4 pb-3"><CourseList courses={courses} /></div>}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xs)" }}>
            <div className="p-4 pb-2">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[14px] font-semibold" style={{ color: "var(--text-primary)" }}>{getSemesterLabel(activeSemester)}</div>
                <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>{filteredCourses.length}门 · {filteredCredits}学分</span>
              </div>
              <CourseList courses={filteredCourses} />
            </div>
          </div>
        )}
      </div>

      {/* GPA 参考 */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xs)" }}>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4" style={{ color: "var(--accent)" }} />
          <span className="text-[12px] font-semibold" style={{ color: "var(--text-secondary)" }}>百分制 ↔ GPA</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {GPA_REF.map(r => (
            <div key={r.range} className="p-2 rounded-xl text-center" style={{ backgroundColor: "var(--surface)" }}>
              <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{r.range}</div>
              <div className="text-[16px] font-bold" style={{ color: r.color }}>{r.gpa}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 共享课程列表组件 ──
function CourseList({ courses }: { courses: JwglCourse[] }) {
  return (
    <div className="space-y-1.5">
      {courses.map((c, i) => {
        const badge = getScoreBadgeStyle(c.score);
        return (
          <div key={`${c.course}-${c.semester}-${i}`} className="flex items-center gap-2.5 p-2.5 rounded-xl" style={{ backgroundColor: i % 2 === 0 ? "transparent" : "var(--surface)" }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[12px] font-bold tabular-nums" style={{ backgroundColor: badge.bg, color: badge.color }}>
              {getScoreDisplay(c.score)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium truncate" style={{ color: "var(--text-primary)" }}>{c.course}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: c.type === "必修" ? "var(--accent-soft)" : "var(--surface)", color: c.type === "必修" ? "var(--accent)" : "var(--text-tertiary)" }}>{c.type}</span>
                <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{c.credit}学分</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
