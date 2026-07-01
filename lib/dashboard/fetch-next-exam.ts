/**
 * 共享的「下一场考试」数据获取逻辑
 * 同时被 ExamCountdownCard 和其他需要考试数据的组件使用
 */

import { parseExamDate } from "@/lib/parse-exam-date";

export interface Exam {
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

export interface NextExamResult {
  nextExam: Exam | null;
  countdown: string;
}

export function formatExamCountdown(dateStr: string): string {
  const diff = new Date(dateStr + "T23:59:59").getTime() - Date.now();
  const days = Math.floor(diff / 86_400_000);
  return days === 0 ? "今天" : days === 1 ? "明天" : `${days} 天后`;
}

export async function fetchNextExam(): Promise<NextExamResult> {
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
          return { nextExam, countdown: formatExamCountdown(dateStr) };
        }
      }
    }
  } catch {
    // fall through to localStorage
  }

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
        countdown: formatExamCountdown(parseExamDate(nextExam.date)),
      };
    }
  } catch {
    // ignore
  }

  return { nextExam: null, countdown: "" };
}
