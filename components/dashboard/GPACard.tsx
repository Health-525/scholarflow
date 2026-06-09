"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { gpaColor } from "@/lib/gpa";
import { GPARing } from "@/components/ui/GPARing";

export function GPACard() {
  const [gpa, setGPA] = useState<string>("--");
  const [totalCredits, setTotalCredits] = useState(0);
  const [courseCount, setCourseCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/local-data?type=grades")
      .then(r => r.json())
      .then(d => {
        if (d?.gpa) setGPA(d.gpa);
        if (d?.totalCredits) setTotalCredits(d.totalCredits);
        if (d?.allCourses?.length) setCourseCount(d.allCourses.length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const gpaNum = parseFloat(gpa) || 0;
  const color = gpaColor(gpaNum);

  return (
    <Link href="/gpa" className="sf-card block p-4" aria-label={`绩点 ${gpa}，点击查看详情`}>
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <GPARing value={gpaNum} size={56} strokeWidth={5} label={`GPA ${gpa}`} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[11px] font-bold" style={{ color }}>{gpaNum > 0 ? gpa : "--"}</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[12px] font-semibold font-display text-foreground">绩点</span>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
          </div>
          {loading ? (
            <div className="h-7 w-16 rounded bg-secondary" />
          ) : (
            <div className="text-[26px] font-bold tabular-nums leading-none" style={{ color }}>{gpa}</div>
          )}
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-[10px] text-muted-foreground">{totalCredits}学分</span>
            <span className="text-[10px] text-muted-foreground">{courseCount}门课</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
