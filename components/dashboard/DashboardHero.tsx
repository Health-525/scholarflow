"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen, CheckCircle2, Clock, MapPin } from "lucide-react";
import Link from "next/link";
import { memo, useEffect, useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { queryKeys, useScheduleQuery } from "@/hooks/useQueries";
import { parseExamDate } from "@/lib/parse-exam-date";
import { courseColor } from "@/lib/schedule/course-color";
import { getNextCourse } from "@/lib/schedule/next-course";
import { getNowInTimeZone } from "@/lib/schedule/timezone";
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

function formatClassCountdown(targetTime: Date): string {
  const diffMs = targetTime.getTime() - Date.now();
  if (diffMs <= 0) return "即将开始";
  const h = Math.floor(diffMs / 3_600_000);
  const m = Math.floor((diffMs % 3_600_000) / 60_000);
  if (h > 0) return `${h} 小时 ${m} 分钟`;
  return `${m} 分钟`;
}

function formatExamCountdown(dateStr: string): string {
  const days = Math.floor(
    (new Date(dateStr + "T23:59:59").getTime() - Date.now()) / 86_400_000,
  );
  if (days <= 0) return "今天";
  if (days === 1) return "明天";
  return `${days} 天后`;
}

async function fetchNextExam(): Promise<Exam | null> {
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
          const exam = futureExams[0];
          const dateStr = parseExamDate(exam.kssj || exam.date);
          return {
            id: "0",
            subject: exam.kcmc || exam.subject || "未命名考试",
            date: dateStr,
            time: exam.kssj?.replace(dateStr, "").replace(/[()]/g, "") || "",
            location: exam.jxdd || exam.location,
          };
        }
      }
    }
  } catch {}

  try {
    const raw = localStorage.getItem("sf_exams");
    if (!raw) return null;
    const exams: Exam[] = JSON.parse(raw)
      .filter(
        (e: Exam) =>
          new Date(parseExamDate(e.date) + "T23:59:59").getTime() > Date.now(),
      )
      .sort((a: Exam, b: Exam) =>
        parseExamDate(a.date).localeCompare(parseExamDate(b.date)),
      );
    return exams[0] ?? null;
  } catch {
    return null;
  }
}

function HeroVisual({
  children,
  color,
}: {
  children: React.ReactNode;
  color: string;
}) {
  return (
    <div
      className="hidden shrink-0 items-center justify-center text-white sm:flex sm:w-24 lg:w-28"
      style={{ backgroundColor: `color-mix(in hsl, ${color}, #0f172a 22%)` }}
    >
      {children}
    </div>
  );
}

function NextClassHero({
  title,
  timeText,
  location,
  startTime,
}: {
  title: string;
  timeText: string;
  location?: string;
  startTime: Date;
}) {
  const [countdown, setCountdown] = useState("");
  const colors = courseColor(title);
  const [start, end] = timeText.split("-");

  useEffect(() => {
    const update = () => setCountdown(formatClassCountdown(startTime));
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [startTime]);

  return (
    <Link href="/schedule" className="block">
      <Card className="overflow-hidden border-border/70 shadow-none hover:-translate-y-0 hover:shadow-none">
        <CardContent className="p-0">
          <div className="flex min-h-[168px] items-stretch">
            <div className="flex-1 p-5">
              <div className="mb-2 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  <BookOpen className="size-3.5" />
                  下一节课
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  {countdown}后开始
                </span>
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                {title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {start?.trim()} - {end?.trim()}
              </p>

              {location && (
                <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="size-4" />
                  <span className="truncate">{location}</span>
                </div>
              )}
            </div>

            <HeroVisual color={colors.accent}>
              <span className="text-4xl font-bold">{title.slice(0, 1)}</span>
            </HeroVisual>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function NextExamHero({ exam }: { exam: Exam }) {
  const daysLeft = Math.max(
    0,
    Math.floor(
      (new Date(exam.date + "T23:59:59").getTime() - Date.now()) / 86_400_000,
    ),
  );
  const urgent = daysLeft <= 3;

  return (
    <Link href="/exams" className="block">
      <Card className="overflow-hidden border-border/70 shadow-none hover:-translate-y-0 hover:shadow-none">
        <CardContent className="p-0">
          <div className="flex min-h-[168px] items-stretch">
            <div className="flex-1 p-5">
              <div className="mb-2 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                  <Clock className="size-3.5" />
                  最近考试
                </span>
                <span
                  className={`text-xs font-medium ${urgent ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {formatExamCountdown(exam.date)}
                </span>
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                {exam.subject}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{exam.date}</p>

              {exam.location && (
                <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="size-4" />
                  <span className="truncate">{exam.location}</span>
                </div>
              )}
            </div>

            <HeroVisual color="#dc2626">
              <div className="text-center">
                <div className="text-4xl font-bold tabular-nums">{daysLeft}</div>
                <p className="mt-1 text-xs font-medium opacity-90">Days Left</p>
              </div>
            </HeroVisual>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function EmptyHero() {
  return (
    <Card className="border-border/70 shadow-none">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-statusSuccess/10">
            <CheckCircle2 className="size-6 text-statusSuccess" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-foreground">今天没有紧急学业节点</h2>
            <p className="text-sm text-muted-foreground">
              没有待上课程，也没有临近考试。
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export const DashboardHero = memo(function DashboardHero() {
  const { schoolId, userId } = useAuthStore((s) => s);
  const { data: scheduleData } = useScheduleQuery();
  const { data: nextExam } = useQuery({
    queryKey: queryKeys.exams(schoolId, userId),
    queryFn: fetchNextExam,
    staleTime: 5 * 60 * 1000,
  });

  const nextCourse = useMemo(() => {
    const schedule = scheduleData?.schedule;
    const adjustments = scheduleData?.adjustments ?? [];
    if (!schedule) return null;
    const tz = schedule.meta.tz || "Asia/Shanghai";
    const today = getNowInTimeZone(tz);
    return getNextCourse(schedule, today, tz, adjustments);
  }, [scheduleData]);

  if (nextCourse) {
    return (
      <NextClassHero
        title={nextCourse.item.title}
        timeText={nextCourse.item.timeText ?? ""}
        location={nextCourse.item.location}
        startTime={nextCourse.startTime}
      />
    );
  }

  if (nextExam) return <NextExamHero exam={nextExam} />;
  return <EmptyHero />;
});

export default DashboardHero;
