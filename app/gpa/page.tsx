"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Calculator, Target } from "lucide-react";
import {
  calculateGPA, predictTarget,
  type Course, type GradeLevel,
  CURRENT_SEMESTER, getSemesterLabel,
} from "@/lib/gpa";

// ── LS persistence ──
const LS_KEY = "sf_gpa_courses";

function loadCourses(): Course[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveCourses(courses: Course[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(courses)); } catch { /* ignore */ }
}

// ── Component ──
export default function GPAPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [newName, setNewName] = useState("");
  const [newCredit, setNewCredit] = useState("3");
  const [newScore, setNewScore] = useState("");
  const [targetGPA, setTargetGPA] = useState("");
  const [showPredict, setShowPredict] = useState(false);
  const [jwglGrades, setJwglGrades] = useState<{gpa:string;allCourses:any[];totalCredits:number}|null>(null);

  useEffect(() => { setCourses(loadCourses()); }, []);
  useEffect(() => {
    fetch("/api/local-data?type=grades")
      .then(r => r.json())
      .then(d => { if (d?.allCourses?.length > 0) setJwglGrades(d); })
      .catch(() => {});
  }, []);

  const gpa = calculateGPA(courses);
  const prediction = targetGPA ? predictTarget(courses, gpa.semesterGPA, parseFloat(targetGPA)) : null;

  const addCourse = () => {
    if (!newName.trim()) return;
    const credit = parseFloat(newCredit) || 0;
    if (credit <= 0) return;

    const course: Course = {
      id: Date.now().toString(36),
      name: newName.trim(),
      credit,
      semester: CURRENT_SEMESTER,
    };

    if (newScore) {
      const s = parseInt(newScore);
      if (s >= 0 && s <= 100) course.score = s;
    }

    const updated = [...courses, course];
    setCourses(updated);
    saveCourses(updated);
    setNewName("");
    setNewScore("");
    setNewCredit("3");
  };

  const updateScore = (id: string, score: string) => {
    const s = parseInt(score);
    const updated = courses.map(c =>
      c.id === id ? { ...c, score: isNaN(s) ? undefined : s, grade: undefined } : c
    );
    setCourses(updated);
    saveCourses(updated);
  };

  const updateGrade = (id: string, grade: GradeLevel | "") => {
    const updated = courses.map(c =>
      c.id === id ? { ...c, grade: grade === "" ? undefined : grade, score: undefined } : c
    );
    setCourses(updated);
    saveCourses(updated);
  };

  const deleteCourse = (id: string) => {
    const updated = courses.filter(c => c.id !== id);
    setCourses(updated);
    saveCourses(updated);
  };

  // GPA color
  const gpaColor = gpa.semesterGPA >= 3.5 ? "var(--status-success)" :
    gpa.semesterGPA >= 2.5 ? "var(--accent)" :
      gpa.semesterGPA >= 1.5 ? "#f59e0b" : "#ef4444";

  return (
    <div className="pb-24 md:pb-0 max-w-2xl mx-auto">
      <div className="mb-6 py-4">
        <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>绩点计算器</h1>
        <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>{getSemesterLabel(CURRENT_SEMESTER)}</p>
      </div>

      {/* ── 教务系统成绩 ── */}
      {jwglGrades ? (
        <div className="rounded-2xl p-4 mb-4" style={{ border: "1px solid #22c55e50", backgroundColor: "var(--surface-card)" }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-semibold" style={{ color: "var(--text-secondary)" }}>📋 教务系统成绩</h2>
            <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
              GPA {jwglGrades.gpa}
            </span>
          </div>
          {jwglGrades.allCourses.map((c: any, i: number) => {
            const s = parseFloat(c.score);
            const color = s >= 90 ? "#22c55e" : s >= 60 ? "var(--text-primary)" : "#ef4444";
            return (
              <div key={i} className="flex items-center justify-between text-[12px] py-1">
                <span className="truncate flex-1" style={{ color: "var(--text-primary)" }}>{c.course}</span>
                <span className="w-10 text-right font-medium" style={{ color }}>{c.score}</span>
                <span className="w-10 text-right" style={{ color: "var(--text-tertiary)" }}>{c.credit}学分</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl p-3 mb-4 text-center" style={{ border: "1px solid var(--border)", backgroundColor: "var(--surface-card)" }}>
          <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>暂未同步教务系统成绩 · 运行 timetable/scripts/fetch_grades_all.js</p>
        </div>
      )}

      {/* GPA display */}
      <div className="rounded-2xl p-6 mb-4 text-center" style={{ border: "1px solid var(--border)", backgroundColor: "var(--surface-card)" }}>
        <div className="text-[56px] font-bold tabular-nums leading-none" style={{ color: gpaColor }}>
          {gpa.semesterGPA.toFixed(2)}
        </div>
        <div className="text-[12px] mt-1" style={{ color: "var(--text-tertiary)" }}>学期绩点</div>
        <div className="flex items-center justify-center gap-6 mt-3">
          <div className="text-center">
            <div className="text-[13px] font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>{gpa.totalCredits}</div>
            <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>已修学分</div>
          </div>
          <div className="text-center">
            <div className="text-[13px] font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>{gpa.completed}/{gpa.completed + gpa.remaining}</div>
            <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>已出成绩</div>
          </div>
        </div>
      </div>

      {/* Add course */}
      <div className="rounded-2xl p-4 mb-4" style={{ border: "1px solid var(--border)", backgroundColor: "var(--surface-card)" }}>
        <div className="flex items-center gap-2 mb-3">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addCourse()}
            placeholder="课程名称"
            className="flex-1 px-3 py-2.5 rounded-xl text-[13px] outline-none"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />
          <input
            value={newCredit}
            onChange={e => setNewCredit(e.target.value)}
            placeholder="学分"
            type="number"
            min="0.5"
            max="10"
            step="0.5"
            className="w-16 px-3 py-2.5 rounded-xl text-[13px] text-center outline-none"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />
          <input
            value={newScore}
            onChange={e => setNewScore(e.target.value)}
            placeholder="分数"
            type="number"
            min="0"
            max="100"
            className="w-16 px-3 py-2.5 rounded-xl text-[13px] text-center outline-none"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />
          <button onClick={addCourse} className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors" style={{ backgroundColor: "var(--accent)", color: "#fff" }}>
            <Plus className="w-5 h-5" />
          </button>
        </div>
        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>分数留空表示该课程尚未出分</p>
      </div>

      {/* Course list */}
      <div className="space-y-2 mb-4">
        {courses.map(c => (
          <div key={c.id} className="flex items-center gap-2 p-3 rounded-xl" style={{ border: "1px solid var(--border-subtle)", backgroundColor: "var(--surface-card)" }}>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium truncate" style={{ color: "var(--text-primary)" }}>{c.name}</div>
              <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{c.credit} 学分</div>
            </div>
            <input
              value={c.score ?? ""}
              onChange={e => updateScore(c.id, e.target.value)}
              placeholder="--"
              type="number"
              min="0"
              max="100"
              className="w-14 px-2 py-2 rounded-lg text-[13px] text-center outline-none"
              style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: c.score !== undefined ? gpaColor : "var(--text-muted)" }}
            />
            <button onClick={() => deleteCourse(c.id)} className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--text-muted)" }}>
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {courses.length === 0 && (
          <p className="text-center text-[12px] py-8" style={{ color: "var(--text-tertiary)" }}>添加本学期课程开始计算绩点</p>
        )}
      </div>

      {/* Target prediction */}
      <div className="rounded-2xl p-4 mb-4" style={{ border: "1px solid var(--border)", backgroundColor: "var(--surface-card)" }}>
        <button onClick={() => setShowPredict(!showPredict)} className="flex items-center gap-2 text-[13px] font-medium mb-3 transition-colors" style={{ color: "var(--accent)" }}>
          <Target className="w-4 h-4" />
          目标预测
        </button>
        {showPredict && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>目标绩点:</span>
              <input
                value={targetGPA}
                onChange={e => setTargetGPA(e.target.value)}
                placeholder="3.5"
                type="number"
                min="0"
                max="4.0"
                step="0.1"
                className="w-20 px-3 py-2 rounded-xl text-[13px] text-center outline-none"
                style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              />
            </div>
            {prediction && (
              <div className="p-3 rounded-xl" style={{ backgroundColor: "var(--surface)" }}>
                {prediction.possible ? (
                  <p className="text-[12px]" style={{ color: "var(--text-primary)" }}>
                    剩余 <strong>{prediction.remainingCredits}</strong> 学分需要平均每门 <strong style={{ color: "var(--accent)" }}>{prediction.neededAvg.toFixed(1)}</strong> GPA
                    {prediction.neededAvg < 2.0 && "，问题不大"}
                    {prediction.neededAvg > 3.5 && "，需要加把劲"}
                  </p>
                ) : (
                  <p className="text-[12px]" style={{ color: "#ef4444" }}>即使剩余课程全拿4.0也无法达到目标绩点</p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Grade reference */}
      <div className="rounded-2xl p-4 mb-4" style={{ border: "1px solid var(--border)", backgroundColor: "var(--surface-card)" }}>
        <div className="text-[12px] font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>百分制 ↔ GPA 参考</div>
        <div className="grid grid-cols-5 gap-1 text-center">
          {[{ range: "≥90", gpa: "4.0" }, { range: "89-86", gpa: "3.7" }, { range: "85-82", gpa: "3.3" }, { range: "81-79", gpa: "3.0" }, { range: "78-75", gpa: "2.7" }, { range: "74-71", gpa: "2.3" }, { range: "70-68", gpa: "2.0" }].map(r => (
            <div key={r.range} className="p-2 rounded-lg" style={{ backgroundColor: "var(--surface)" }}>
              <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{r.range}</div>
              <div className="text-[15px] font-bold" style={{ color: "var(--accent)" }}>{r.gpa}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
