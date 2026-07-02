"use client";

import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import Link from "next/link";
import { memo } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { queryKeys } from "@/hooks/useQueries";
import { fetchNextExam } from "@/lib/dashboard/fetch-next-exam";
import { parseExamDate } from "@/lib/parse-exam-date";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";

export const ExamCountdownCard = memo(function ExamCountdownCard() {
  const schoolId = useAuthStore((s) => s.schoolId);
  const userId = useAuthStore((s) => s.userId);
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
