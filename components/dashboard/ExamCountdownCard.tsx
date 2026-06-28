"use client";

import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import Link from "next/link";
import { memo } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { queryKeys } from "@/hooks/useQueries";
import { parseExamDate } from "@/lib/parse-exam-date";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";

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
  status?: string;
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
            if (e.status && e.status !== "upcoming") return false;
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

export const ExamCountdownCard = memo(function ExamCountdownCard() {
  const { schoolId, userId } = useAuthStore((s) => s);
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.exams(schoolId, userId),
    queryFn: fetchNextExam,
    refetchInterval: 60_000,
    staleTime: 5 * 60 * 1000,
  });

  const nextExam = data?.nextExam ?? null;
  const countdown = data?.countdown ?? "";

  const urgent =
    nextExam &&
    new Date(parseExamDate(nextExam.date) + "T23:59:59").getTime() -
      Date.now() <
      3 * 86400000;

  return (
    <Link href="/exams" aria-label="考试倒计时">
      <Card className="h-full transition-colors hover:bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div
              className={cn(
                "flex size-7 items-center justify-center rounded-lg",
                urgent ? "bg-destructive/10" : "bg-primary/10"
              )}
            >
              <Clock className={cn("size-4", urgent ? "text-destructive" : "text-primary")} />
            </div>
            <h2 className="text-sm font-semibold text-foreground">考试倒计时</h2>
          </div>

          {isLoading ? (
            <div className="skeleton h-10 w-24 rounded" />
          ) : nextExam ? (
            <div className="space-y-1">
              <div
                className={cn(
                  "text-4xl font-black tabular-nums leading-none",
                  urgent ? "text-destructive animate-pulse" : "text-foreground"
                )}
              >
                {countdown}
              </div>
              <div className="text-sm font-medium text-foreground truncate">
                {nextExam.subject}
              </div>
              <div className="text-xs text-muted-foreground">{nextExam.date}</div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">暂无考试</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
});

export default ExamCountdownCard;
