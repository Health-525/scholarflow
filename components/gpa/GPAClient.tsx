"use client";

import { TrendingUp, BookOpen, ChevronDown, BarChart3 } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { GPARing } from "@/components/ui/GPARing";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  scoreToGPA,
  gpaColor,
  gpaColorRGB,
  getScoreBadgeStyle,
  getScoreDisplay,
  getSemesterLabel,
} from "@/lib/gpa";
import type { JwglCourse, JwglGrades } from "@/lib/gpa/server-data";
import { getScoreRanges, getGPARef } from "@/lib/theme-colors";

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
  let totalPoints = 0;
  let totalCredits = 0;
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

interface GPAClientProps {
  grades: JwglGrades | null;
}

export function GPAClient({ grades }: GPAClientProps) {
  const [activeSemester, setActiveSemester] = useState<string>("all");
  const [expandedSemesters, setExpandedSemesters] = useState<Record<string, boolean>>({});

  const toggleSemester = (sem: string) => {
    setExpandedSemesters((prev) => ({ ...prev, [sem]: !prev[sem] }));
  };

  const semesters = useMemo(() => (grades ? groupBySemester(grades.allCourses) : {}), [grades]);
  const semesterKeys = useMemo(() => Object.keys(semesters), [semesters]);

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
  const filteredRequired = useMemo(
    () => filteredCourses.filter((c) => c.type === "必修").length,
    [filteredCourses]
  );

  const SCORE_RANGES = getScoreRanges();
  const GPA_REF = getGPARef();
  const numeric = useMemo(
    () => filteredCourses.filter((c) => !isNaN(parseFloat(c.score))),
    [filteredCourses]
  );
  const rangeCounts = useMemo(
    () =>
      SCORE_RANGES.map(
        (r) =>
          numeric.filter((c) => {
            const s = parseFloat(c.score);
            return s >= r.min && s < r.max;
          }).length
      ),
    [numeric, SCORE_RANGES]
  );
  const maxCount = Math.max(...rangeCounts, 1);

  const filterOptions = useMemo(
    () => [
      { id: "all", label: "全部" },
      ...semesterKeys.map((sem) => ({
        id: sem,
        label: getSemesterLabel(sem),
      })),
    ],
    [semesterKeys]
  );

  if (!grades) {
    return (
      <div className="max-w-5xl mx-auto pb-20 md:pb-0">
        <PageHeader icon={<TrendingUp className="w-5 h-5 text-primary" />} title="绩点" />
        <EmptyState
          icon={BookOpen}
          title="暂未同步教务系统成绩"
          description="在仪表盘或设置页点击「刷新」从教务系统获取成绩"
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-20 md:pb-0">
      <PageHeader
        icon={<TrendingUp className="w-5 h-5 text-primary" />}
        title="绩点"
        description="数据来自教务系统"
      />

      {/* 学期筛选 */}
      <div className="mb-4 overflow-x-auto pb-1 -mx-1 px-1">
        <SegmentedControl
          options={filterOptions}
          value={activeSemester}
          onChange={setActiveSemester}
          className="min-w-max"
        />
      </div>

      {/* GPA 主卡片 */}
      <Card className="mb-4 text-center relative overflow-hidden">
        <CardContent className="relative flex flex-col items-center pt-6 pb-6">
          <div className="relative">
            <GPARing value={filteredGPA} size={140} strokeWidth={10} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div
                className="text-4xl font-bold tabular-nums leading-none"
                style={{ color: gpaColor(filteredGPA) }}
              >
                {filteredGPA > 0 ? filteredGPA.toFixed(2) : "--"}
              </div>
              <div className="text-xs mt-0.5 text-muted-foreground">GPA</div>
            </div>
          </div>
          <div className="flex items-center gap-0 mt-4 w-full max-w-xs">
            {[
              { value: filteredCredits, label: "学分" },
              { value: filteredCourses.length, label: "课程" },
              { value: filteredRequired, label: "必修" },
            ].map((item, i) => (
              <div
                key={item.label}
                className={`flex-1 text-center ${i < 2 ? "border-r border-border" : ""}`}
              >
                <div className="text-lg font-semibold tabular-nums text-foreground">
                  {item.value}
                </div>
                <div className="text-xs text-muted-foreground">{item.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 成绩分布 */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <BarChart3 className="w-4 h-4 text-primary" />
            成绩分布
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {numeric.length}门有分数
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {SCORE_RANGES.map((r, ri) => {
              const count = rangeCounts[ri];
              const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
              return (
                <div key={r.label}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
                      <span className="text-xs font-medium text-muted-foreground">{r.label}</span>
                      <span className="text-xs text-muted-foreground/60">{r.sub}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold tabular-nums text-foreground">{count}</span>
                      <span className="text-xs text-muted-foreground">门</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden bg-secondary">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor: r.color,
                        opacity: 0.85,
                        transition: "width 0.6s ease",
                        minWidth: count > 0 ? "6px" : "0",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 课程列表 */}
      <div className="mb-4">
        {activeSemester === "all" ? (
          <div className="space-y-3">
            {Object.entries(semesters).map(([sem, courses]) => {
              const semGPA = semesterGPAs[sem];
              const expanded = expandedSemesters[sem] ?? false;
              const semCredits = calcCredits(courses);
              return (
                <Card key={sem} className="overflow-hidden">
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full h-auto flex items-center justify-between p-4 text-left rounded-none"
                    onClick={() => toggleSemester(sem)}
                    aria-expanded={expanded}
                    aria-label={`${getSemesterLabel(sem)}，${courses.length}门课程，GPA ${semGPA > 0 ? semGPA.toFixed(2) : "--"}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground">
                        {getSemesterLabel(sem)}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-muted-foreground">{courses.length}门</span>
                        <span className="text-xs text-muted-foreground">{semCredits}学分</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        className="px-3 py-1.5 rounded-xl text-center"
                        style={{
                          backgroundColor: `rgba(${gpaColorRGB(semGPA)}, 0.08)`,
                        }}
                      >
                        <div
                          className="text-lg font-bold tabular-nums leading-none"
                          style={{ color: gpaColor(semGPA) }}
                        >
                          {semGPA > 0 ? semGPA.toFixed(2) : "--"}
                        </div>
                      </div>
                      <ChevronDown
                        className="w-4 h-4 shrink-0 transition-transform duration-200 text-muted-foreground"
                        style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)" }}
                      />
                    </div>
                  </Button>
                  {expanded && (
                    <CardContent className="pt-0 pb-3">
                      <CourseList courses={courses} />
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-sm">
                <span>{getSemesterLabel(activeSemester)}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {filteredCourses.length}门 · {filteredCredits}学分
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <CourseList courses={filteredCourses} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* GPA 参考 */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-primary" />
            百分制 ↔ GPA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2">
            {GPA_REF.map((r) => (
              <div key={r.range} className="p-2 rounded-xl text-center bg-secondary">
                <Badge variant="secondary" className="text-xs">
                  {r.range}
                </Badge>
                <div className="text-base font-bold mt-1" style={{ color: r.color }}>
                  {r.gpa}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CourseList({ courses }: { courses: JwglCourse[] }) {
  return (
    <div className="space-y-1.5">
      {courses.map((c, i) => {
        const badge = getScoreBadgeStyle(c.score);
        return (
          <div
            key={`${c.course}-${c.semester}-${i}`}
            className={`flex items-center gap-3 p-3 rounded-xl ${i % 2 !== 0 ? "bg-secondary" : ""}`}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold tabular-nums"
              style={{ backgroundColor: badge.bg, color: badge.color }}
            >
              {getScoreDisplay(c.score)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate text-foreground">{c.course}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant={c.type === "必修" ? "default" : "secondary"} className="text-xs">
                  {c.type}
                </Badge>
                <span className="text-xs text-muted-foreground">{c.credit}学分</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
