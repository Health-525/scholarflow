"use client";

import { Calculator } from "lucide-react";
import { useState, useEffect } from "react";
import { calculateGPA, type Course } from "@/lib/gpa";
import Link from "next/link";

export function GPACard() {
  const [gpa, setGPA] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("sf_gpa_courses");
      if (raw) {
        const courses: Course[] = JSON.parse(raw);
        setGPA(calculateGPA(courses).semesterGPA);
      }
    } catch { /* ignore */ }
  }, []);

  const color = gpa >= 3.5 ? "var(--status-success)" : gpa >= 2.5 ? "var(--accent)" : gpa >= 1.5 ? "#f59e0b" : "#ef4444";

  return (
    <Link href="/gpa" className="block sf-card p-4 animate-fade-up" style={{ display: "block" }}>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--accent-soft)" }}>
          <Calculator className="w-4 h-4" style={{ color: "var(--accent)" }} />
        </div>
        <span className="text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>绩点</span>
      </div>
      <div className="text-[28px] font-bold tabular-nums" style={{ color }}>{gpa > 0 ? gpa.toFixed(2) : "--"}</div>
      <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{gpa > 0 ? "点击管理课程" : "录入成绩开始计算"}</div>
    </Link>
  );
}
