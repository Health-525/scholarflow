"use client";

import { Clock, RefreshCw, X } from "lucide-react";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/skeleton";
import { showToast } from "@/components/ui/ToastContainer";
import { useScheduleQuery } from "@/hooks/useQueries";
import {
  fetchExams,
  addExam,
  patchExam,
  deleteExam,
  importExamsFromJwgl,
} from "@/lib/exams-api";
import { useAuthStore } from "@/store/auth";
import type { Exam } from "@/types/exam";

import { ExamItem } from "./components/ExamItem";
import { ExamStats } from "./components/ExamStats";
import { QuickAddForm } from "./components/QuickAddForm";

function todayLabel(): string {
  return new Date().toLocaleDateString("zh-CN", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function ExamsPage() {
  const { schoolId, userId } = useAuthStore((s) => s);

  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [filter, setFilter] = useState<"all" | "upcoming" | "completed">("all");
  const autoImportedRef = useRef(false);
  const pendingDeleteRef = useRef<{
    exam: Exam;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);

  const { data: scheduleData } = useScheduleQuery();
  const schedule = scheduleData?.schedule;

  const subjects = useMemo(() => {
    const titles =
      schedule?.courses?.map((c: { title: string }) => c.title) ?? [];
    return Array.from(new Set(titles))
      .filter((s): s is string => Boolean(s))
      .sort();
  }, [schedule]);

  // ── 数据加载 ─────────────────────────────────────────────

  const rollbackRef = useRef<Exam[] | null>(null);

  const refresh = useCallback(async () => {
    const data = await fetchExams(schoolId, userId);
    setExams(data);
  }, [schoolId, userId]);

  useEffect(() => {
    setLoading(true);
    refresh()
      .catch((err) => {
        showToast("error", err instanceof Error ? err.message : "加载考试失败");
      })
      .then(async () => {
        if (autoImportedRef.current) return;
        autoImportedRef.current = true;
        requestAnimationFrame(() => {
          setImporting(true);
          importExamsFromJwgl(schoolId, userId)
            .then(async ({ added }) => {
              if (added > 0) {
                await refresh();
                showToast("success", `已自动导入 ${added} 场考试`);
              }
            })
            .catch(() => {
              showToast("error", "教务数据同步失败");
            })
            .finally(() => setImporting(false));
        });
      })
      .finally(() => setLoading(false));
  }, [refresh, schoolId, userId]);

  // 卸载时落盘待删除缓冲
  useEffect(() => {
    return () => {
      if (pendingDeleteRef.current) {
        clearTimeout(pendingDeleteRef.current.timer);
        deleteExam(pendingDeleteRef.current.exam.id, schoolId, userId);
        pendingDeleteRef.current = null;
      }
    };
  }, [schoolId, userId]);

  // ── 操作 ─────────────────────────────────────────────────

  const handleAdd = async (payload: Omit<Exam, "id" | "source" | "status">) => {
    const optimistic: Exam = {
      id: `pending-${Date.now()}`,
      ...payload,
      source: "manual",
      status: "upcoming",
    };
    setExams((prev) => {
      rollbackRef.current = prev;
      return [...prev, optimistic].sort((a, b) =>
        a.date.localeCompare(b.date)
      );
    });
    try {
      const created = await addExam(payload, schoolId, userId);
      setExams((prev) =>
        prev.map((e) => (e.id === optimistic.id ? created : e))
      );
      showToast("success", "已添加考试");
    } catch (err) {
      setExams(rollbackRef.current ?? []);
      showToast("error", err instanceof Error ? err.message : "添加考试失败");
    } finally {
      rollbackRef.current = null;
    }
  };

  const handleComplete = async (id: string) => {
    setExams((prev) => {
      rollbackRef.current = prev;
      return prev.map((e) =>
        e.id === id
          ? { ...e, status: "completed" as const, completedAt: Date.now() }
          : e
      );
    });
    try {
      await patchExam(id, "completed", schoolId, userId);
    } catch (err) {
      if (rollbackRef.current) setExams(rollbackRef.current);
      showToast("error", err instanceof Error ? err.message : "标记完成失败");
    } finally {
      rollbackRef.current = null;
    }
  };

  const handleUncomplete = async (id: string) => {
    setExams((prev) => {
      rollbackRef.current = prev;
      return prev.map((e) =>
        e.id === id
          ? { ...e, status: "upcoming" as const, completedAt: undefined }
          : e
      );
    });
    try {
      await patchExam(id, "upcoming", schoolId, userId);
    } catch (err) {
      if (rollbackRef.current) setExams(rollbackRef.current);
      showToast("error", err instanceof Error ? err.message : "撤销完成失败");
    } finally {
      rollbackRef.current = null;
    }
  };

  const handleDelete = async (id: string) => {
    const target = exams.find((e) => e.id === id);
    if (!target) return;

    if (target.source === "manual") {
      setExams((prev) => {
        rollbackRef.current = prev;
        return prev.filter((e) => e.id !== id);
      });

      if (pendingDeleteRef.current) {
        clearTimeout(pendingDeleteRef.current.timer);
        deleteExam(
          pendingDeleteRef.current.exam.id,
          schoolId,
          userId
        ).catch(() => {});
      }

      const timer = setTimeout(() => {
        deleteExam(target.id, schoolId, userId).catch((err) => {
          if (rollbackRef.current) setExams(rollbackRef.current);
          showToast(
            "error",
            err instanceof Error ? err.message : "删除考试失败"
          );
        });
        pendingDeleteRef.current = null;
      }, 5000);

      pendingDeleteRef.current = { exam: target, timer };

      toast(`已删除「${target.subject}」`, {
        duration: 5000,
        action: {
          label: "撤销",
          onClick: () => {
            if (pendingDeleteRef.current?.exam.id === target.id) {
              clearTimeout(pendingDeleteRef.current.timer);
              pendingDeleteRef.current = null;
              setExams((prev) =>
                [...prev, target].sort((a, b) =>
                  a.date.localeCompare(b.date)
                )
              );
            }
          },
        },
      });
      return;
    }

    // 教务考试：标记 deleted
    setExams((prev) => {
      rollbackRef.current = prev;
      return prev.map((e) =>
        e.id === id ? { ...e, status: "deleted" as const } : e
      );
    });
    try {
      await deleteExam(id, schoolId, userId);
    } catch (err) {
      if (rollbackRef.current) setExams(rollbackRef.current);
      showToast("error", err instanceof Error ? err.message : "删除考试失败");
    } finally {
      rollbackRef.current = null;
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const { added } = await importExamsFromJwgl(schoolId, userId);
      await refresh();
      if (added > 0) {
        showToast("success", `已导入 ${added} 场考试`);
      } else {
        showToast("info", "没有新考试");
      }
    } catch {
      showToast("error", "教务数据同步失败");
    } finally {
      setImporting(false);
    }
  };

  // ── 分区 ─────────────────────────────────────────────────

  const visible = exams.filter((e) => e.status !== "deleted");
  const upcoming = visible
    .filter((e) => e.status === "upcoming")
    .sort((a, b) => a.date.localeCompare(b.date));
  const completed = visible
    .filter((e) => e.status === "completed")
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

  const headerDescription = loading
    ? "加载中…"
    : upcoming.length > 0
      ? `${todayLabel()} · ${upcoming.length} 场待考`
      : `${todayLabel()} · 暂无待考科目`;

  useEffect(() => {
    if (!loading && upcoming.length === 0 && completed.length > 0) {
      setShowCompleted(true);
    }
  }, [loading, upcoming.length, completed.length]);

  // ── 渲染 ─────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto min-h-screen bg-background text-foreground animate-page pb-24 md:pb-8">
      <PageHeader
        icon={<Clock className="size-5 text-primary" />}
        title="考试"
        description={headerDescription}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleImport}
            disabled={importing}
            className="h-9 gap-1.5"
          >
            <RefreshCw
              className={`size-4 ${importing ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">同步教务数据</span>
            <span className="sm:hidden">同步</span>
          </Button>
        }
      />

      <div className="space-y-5">
        {loading && (
          <Card hover={false} className="p-4">
            <ListSkeleton count={4} />
          </Card>
        )}

        {!loading && visible.length === 0 && (
          <EmptyState
            icon={Clock}
            title="暂无考试"
            description="在下方添加第一场考试，自动开启倒计时"
          />
        )}

        {!loading && visible.length > 0 && (
          <ExamStats exams={exams} filter={filter} onFilter={setFilter} />
        )}

        {/* 筛选状态 */}
        {!loading && filter !== "all" && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-sm">
            <span className="text-muted-foreground">当前筛选：</span>
            <Badge variant="secondary" className="gap-1">
              {filter === "upcoming" ? "待考" : "已完成"}
              <button
                onClick={() => setFilter("all")}
                className="ml-1 hover:text-foreground transition-colors"
                aria-label="清除筛选"
              >
                <X size={12} />
              </button>
            </Badge>
            <span className="text-muted-foreground text-xs ml-auto">
              {filter === "upcoming" ? upcoming.length : completed.length} 场考试
            </span>
          </div>
        )}

        {/* 待考列表 */}
        {!loading && (filter === "all" || filter === "upcoming") && upcoming.length > 0 && (
          <Card hover={false}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">待考</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {upcoming.length} 场
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcoming.map((exam) => (
                <ExamItem
                  key={exam.id}
                  exam={exam}
                  onComplete={handleComplete}
                  onUncomplete={handleUncomplete}
                  onDelete={handleDelete}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* 已完成列表 */}
        {!loading && (filter === "all" || filter === "completed") && completed.length > 0 && (
          <Card hover={false}>
            <CardHeader>
              <button
                type="button"
                onClick={() => setShowCompleted((v) => !v)}
                className="flex w-full items-center justify-between text-left"
              >
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  已完成
                </CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {completed.length} 场
                </Badge>
              </button>
            </CardHeader>
            {(showCompleted || filter === "completed") && (
              <CardContent className="space-y-2">
                {completed.map((exam) => (
                  <ExamItem
                    key={exam.id}
                    exam={exam}
                    onComplete={handleComplete}
                    onUncomplete={handleUncomplete}
                    onDelete={handleDelete}
                  />
                ))}
              </CardContent>
            )}
          </Card>
        )}

        <QuickAddForm
          subjects={subjects}
          onAdd={handleAdd}
          disabled={loading}
        />
      </div>
    </div>
  );
}
