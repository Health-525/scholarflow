"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { gpaColor } from "@/lib/gpa";
import { GPARing } from "@/components/ui/GPARing";
import { cardClasses } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
    <Link href="/gpa" className={cn(cardClasses, "h-full")} aria-label={`绩点 ${gpa}，点击查看详情`}>
      <div className="flex flex-col h-full p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110" style={{ backgroundColor: `${color}15` }}>
            <svg className="w-3.5 h-3.5" style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          <span className="text-[12px] font-semibold font-display text-foreground">绩点</span>
        </div>
        <div className="flex-1 flex items-center justify-center relative">
          <div className="absolute -right-2 -bottom-2 w-16 h-16 rounded-full opacity-[0.06] pointer-events-none group-hover:opacity-[0.12] transition-opacity duration-300" style={{ backgroundColor: color }} />
          <div className="relative">
            <GPARing value={gpaNum} size={64} strokeWidth={5} label="" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[14px] font-bold transition-transform duration-200 group-hover:scale-110" style={{ color }}>{gpaNum > 0 ? gpa : "--"}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-3 mt-2">
          <span className="text-[10px] text-muted-foreground">{totalCredits}学分</span>
          <span className="text-[10px] text-muted-foreground">{courseCount}门课</span>
        </div>
      </div>
    </Link>
  );
}
