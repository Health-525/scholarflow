"use client";

import { Clock } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";

interface Exam { id: string; subject: string; date: string; time?: string; location?: string; }

export function ExamCountdownCard() {
  const [nextExam, setNextExam] = useState<Exam | null>(null);
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    const check = async () => {
      try {
        // 优先本地API（教务系统数据）
        const res = await fetch("/api/local-data?type=exams");
        if (res.ok) {
          const apiExams = await res.json();
          if (Array.isArray(apiExams) && apiExams.length > 0) {
            const futureExams = apiExams
              .filter((e: any) => {
                const dateStr = (e.kssj || "").match(/\d{4}-\d{2}-\d{2}/)?.[0] || e.date;
                return new Date(dateStr + "T23:59:59").getTime() > Date.now();
              })
              .sort((a: any, b: any) => {
                const da = (a.kssj || a.date || "").match(/\d{4}-\d{2}-\d{2}/)?.[0] || "";
                const db = (b.kssj || b.date || "").match(/\d{4}-\d{2}-\d{2}/)?.[0] || "";
                return da.localeCompare(db);
              });
            if (futureExams.length > 0) {
              const e = futureExams[0];
              const dateStr = (e.kssj || e.date || "").match(/\d{4}-\d{2}-\d{2}/)?.[0] || "";
              setNextExam({ id: "0", subject: e.kcmc || e.subject, date: dateStr, time: e.kssj?.replace(dateStr, "").replace(/[()]/g, "") || "", location: e.jxdd || e.location });
              const diff = new Date(dateStr + "T23:59:59").getTime() - Date.now();
              const days = Math.floor(diff / 86400000);
              setCountdown(days === 0 ? "今天" : days === 1 ? "明天" : `${days} 天后`);
              return;
            }
          }
        }
      } catch {}

      // 备用localStorage
      try {
        const raw = localStorage.getItem("sf_exams");
        if (!raw) return;
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
    };
    check();
    const t = setInterval(check, 60000);
    return () => clearInterval(t);
  }, []);

  const urgent = nextExam && (
    new Date(nextExam.date + "T23:59:59").getTime() - Date.now() < 3 * 86400000
  );

  return (
    <Link href="/exams" className="block sf-card p-4 animate-fade-up" style={{ display: "block" }}>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: urgent ? "rgba(239,68,68,0.1)" : "var(--accent-soft)" }}>
          <Clock className="w-4 h-4" style={{ color: urgent ? "#ef4444" : "var(--accent)" }} />
        </div>
        <span className="text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>考试</span>
      </div>
      {nextExam ? (
        <>
          <div className="text-[14px] font-bold truncate" style={{ color: "var(--text-primary)" }}>{nextExam.subject}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[20px] font-bold tabular-nums" style={{ color: urgent ? "#ef4444" : "var(--accent)" }}>{countdown}</span>
            <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{nextExam.date}</span>
          </div>
        </>
      ) : (
        <div className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>暂无考试</div>
      )}
    </Link>
  );
}
