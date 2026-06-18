"use client";

import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import Link from "next/link";

import { cardClasses } from "@/components/ui/card";
import { queryKeys } from "@/hooks/useQueries";
import { parseExamDate } from "@/lib/parse-exam-date";
import { cn } from "@/lib/utils";

interface Exam {
  id: string;
  subject: string;
  date: string;
  time?: string;
  location?: string;
}

interface JWGLExamRaw {
  kcmc?: string;
  kssj?: string;
  jxdd?: string;
  date?: string;
  subject?: string;
  location?: string;
}

interface ExamCountdownResult {
  nextExam: Exam | null;
  countdown: string;
}

function formatCountdown(dateStr: string): string {
  const diff = new Date(dateStr + "T23:59:59").getTime() - Date.now();
  const days = Math.floor(diff / 86400000);
  return days === 0 ? "今天" : days === 1 ? "明天" : `${days} 天后`;
}

async function fetchNextExam(): Promise<ExamCountdownResult> {
  try {
    const res = await fetch("/api/local-data?type=exams");
    if (res.ok) {
      const apiExams: JWGLExamRaw[] = await res.json();
      if (Array.isArray(apiExams) && apiExams.length > 0) {
        const futureExams = apiExams
          .filter((e) => {
            const dateStr = parseExamDate(e.kssj || e.date);
            return new Date(dateStr + "T23:59:59").getTime() > Date.now();
          })
          .sort((a, b) => {
            const da = parseExamDate(a.kssj || a.date);
            const db = parseExamDate(b.kssj || b.date);
            return da.localeCompare(db);
          });
        if (futureExams.length > 0) {
          const e = futureExams[0];
          const dateStr = parseExamDate(e.kssj || e.date);
          const nextExam: Exam = {
            id: "0",
            subject: e.kcmc || e.subject || "未知科目",
            date: dateStr,
            time: e.kssj?.replace(dateStr, "").replace(/[()]/g, "") || "",
            location: e.jxdd || e.location,
          };
          return { nextExam, countdown: formatCountdown(dateStr) };
        }
      }
    }
  } catch {}

  try {
    const raw = localStorage.getItem("sf_exams");
    if (!raw) return { nextExam: null, countdown: "" };
    const exams: Exam[] = JSON.parse(raw)
      .filter(
        (e: Exam) =>
          new Date(parseExamDate(e.date) + "T23:59:59").getTime() > Date.now(),
      )
      .sort((a: Exam, b: Exam) =>
        parseExamDate(a.date).localeCompare(parseExamDate(b.date)),
      );
    if (exams.length > 0) {
      const nextExam = exams[0];
      return {
        nextExam,
        countdown: formatCountdown(parseExamDate(nextExam.date)),
      };
    }
  } catch {
    /* ignore */
  }

  return { nextExam: null, countdown: "" };
}

export function ExamCountdownCard() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.exams,
    queryFn: fetchNextExam,
    refetchInterval: 60_000,
    staleTime: 0,
  });

  const nextExam = data?.nextExam ?? null;
  const countdown = data?.countdown ?? "";

  const urgent =
    nextExam &&
    new Date(parseExamDate(nextExam.date) + "T23:59:59").getTime() -
      Date.now() <
      3 * 86400000;

  return (
    <Link
      href="/exams"
      className={cn(cardClasses, "h-full")}
      aria-label="考试倒计时"
    >
      <div className="flex flex-col h-full p-4">
        <div className="flex items-center gap-2 mb-2">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-110 ${urgent ? "bg-destructive/10" : "bg-primary/10"}`}
          >
            <Clock className={`w-3.5 h-3.5 ${urgent ? "text-destructive" : "text-primary"}`} />
          </div>
          <span className="text-[12px] font-semibold text-foreground font-display">
            考试倒计时
          </span>
        </div>
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="skeleton h-12 w-24 rounded-xl" />
          </div>
        ) : nextExam ? (
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <div
              className={`absolute -right-2 -bottom-2 w-16 h-16 rounded-full opacity-[0.06] pointer-events-none group-hover:opacity-[0.12] transition-opacity duration-300 ${urgent ? "bg-destructive" : "bg-primary"}`}
            />
            <div
              className={`text-[28px] font-bold tabular-nums transition-transform duration-200 group-hover:scale-105 ${urgent ? "text-destructive" : "text-primary"}`}
            >
              {countdown}
            </div>
            <div className="text-[12px] font-medium truncate text-foreground mt-1">
              {nextExam.subject}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {nextExam.date}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-[12px] text-muted-foreground">暂无考试</span>
          </div>
        )}
      </div>
    </Link>
  );
}
