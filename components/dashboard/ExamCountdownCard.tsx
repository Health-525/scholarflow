"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Exam { id: string; subject: string; date: string; time?: string; location?: string; }

interface JWGLExamRaw {
  kcmc?: string;
  kssj?: string;
  jxdd?: string;
  date?: string;
  subject?: string;
  location?: string;
}

export function ExamCountdownCard() {
  const [nextExam, setNextExam] = useState<Exam | null>(null);
  const [countdown, setCountdown] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/local-data?type=exams");
        if (res.ok) {
          const apiExams: JWGLExamRaw[] = await res.json();
          if (Array.isArray(apiExams) && apiExams.length > 0) {
            const futureExams = apiExams
              .filter((e) => {
                const dateStr = (e.kssj || "").match(/\d{4}-\d{2}-\d{2}/)?.[0] || e.date || "";
                return new Date(dateStr + "T23:59:59").getTime() > Date.now();
              })
              .sort((a, b) => {
                const da = (a.kssj || a.date || "").match(/\d{4}-\d{2}-\d{2}/)?.[0] || "";
                const db = (b.kssj || b.date || "").match(/\d{4}-\d{2}-\d{2}/)?.[0] || "";
                return da.localeCompare(db);
              });
            if (futureExams.length > 0) {
              const e = futureExams[0];
              const dateStr = (e.kssj || e.date || "").match(/\d{4}-\d{2}-\d{2}/)?.[0] || "";
              setNextExam({ id: "0", subject: e.kcmc || e.subject || "未知科目", date: dateStr, time: e.kssj?.replace(dateStr, "").replace(/[()]/g, "") || "", location: e.jxdd || e.location });
              const diff = new Date(dateStr + "T23:59:59").getTime() - Date.now();
              const days = Math.floor(diff / 86400000);
              setCountdown(days === 0 ? "今天" : days === 1 ? "明天" : `${days} 天后`);
              setLoading(false);
              return;
            }
          }
        }
      } catch {}

      // Fallback: localStorage
      try {
        const raw = localStorage.getItem("sf_exams");
        if (!raw) { setLoading(false); return; }
        const exams: Exam[] = JSON.parse(raw)
          .filter((e: Exam) => new Date(e.date + "T23:59:59").getTime() > Date.now())
          .sort((a: Exam, b: Exam) => a.date.localeCompare(b.date));
        if (exams.length > 0) {
          setNextExam(exams[0]);
          const diff = new Date(exams[0].date + "T23:59:59").getTime() - Date.now();
          const days = Math.floor(diff / 86400000);
          setCountdown(days === 0 ? "今天" : days === 1 ? "明天" : `${days} 天后`);
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    check();
    const t = setInterval(check, 60000);
    return () => clearInterval(t);
  }, []);

  const urgent = nextExam && (
    new Date(nextExam.date + "T23:59:59").getTime() - Date.now() < 3 * 86400000
  );

  return (
    <Link href="/exams" className="block sf-card p-4 group">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-110 ${urgent ? "bg-red-500/10" : "bg-primary/10"}`}>
          <svg className={`w-3.5 h-3.5 ${urgent ? "text-red-500" : "text-primary"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <span className="text-[12px] font-semibold text-foreground">考试倒计时</span>
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="skeleton h-5 w-24 rounded" />
          <div className="skeleton h-7 w-16 rounded" />
        </div>
      ) : nextExam ? (
        <div>
          <div className="text-[14px] font-bold truncate text-foreground mb-1">{nextExam.subject}</div>
          <div className="flex items-center gap-2">
            <span className={`text-[22px] font-bold tabular-nums transition-transform duration-200 group-hover:scale-105 ${urgent ? "text-red-500" : "text-primary"}`}>{countdown}</span>
            <span className="text-[10px] text-muted-foreground">{nextExam.date}</span>
          </div>
          {nextExam.location && (
            <div className="text-[11px] text-muted-foreground mt-1">{nextExam.location}</div>
          )}
        </div>
      ) : (
        <div className="text-[13px] text-muted-foreground py-2">暂无考试安排</div>
      )}
    </Link>
  );
}