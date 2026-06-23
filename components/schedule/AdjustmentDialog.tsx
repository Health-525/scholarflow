"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Adjustment, AdjustmentDraft, AdjustmentMode } from "@/lib/schedule/adjustments";
import { findConflicts } from "@/lib/schedule/adjustments";
import { getWeekNumber } from "@/lib/schedule/schedule";
import type { CourseView, RawScheduleData, Weekday } from "@/lib/schedule/schedule";

const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];
const ALL_WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 7];
const ALL_PERIODS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

interface AdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: RawScheduleData;
  sourceItem: CourseView;
  sourceDate: Date;
  initialTarget?: {
    weekday: Weekday;
    periods: number[];
    weekOffset: number;
  };
  adjustments: Adjustment[];
  onConfirm: (draft: AdjustmentDraft) => void;
}

export function AdjustmentDialog({
  open,
  onOpenChange,
  schedule,
  sourceItem,
  sourceDate,
  initialTarget,
  adjustments,
  onConfirm,
}: AdjustmentDialogProps) {
  const sourceWeek = getWeekNumber(sourceDate, schedule.meta.week1_monday);
  const sourceLen = sourceItem.periods.length;

  const [weekOffset, setWeekOffset] = useState(initialTarget?.weekOffset ?? 0);
  const [targetWeekday, setTargetWeekday] = useState<Weekday>(
    initialTarget?.weekday ?? sourceItem.weekday
  );
  const [targetStartPeriod, setTargetStartPeriod] = useState(
    initialTarget?.periods[0] ?? sourceItem.periods[0]
  );
  const [mode, setMode] = useState<AdjustmentMode>("longterm");
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (!open) return;
    setWeekOffset(initialTarget?.weekOffset ?? 0);
    setTargetWeekday(initialTarget?.weekday ?? sourceItem.weekday);
    setTargetStartPeriod(initialTarget?.periods[0] ?? sourceItem.periods[0]);
    setMode("longterm");
    setError(null);
  }, [open, initialTarget, sourceItem]);

  const targetPeriods = useMemo(() => {
    return Array.from({ length: sourceLen }, (_, i) => targetStartPeriod + i).filter(
      (p) => p <= 10
    );
  }, [sourceLen, targetStartPeriod]);

  const targetWeek = sourceWeek + weekOffset;
  const targetDate = useMemo(() => {
    const d = new Date(sourceDate);
    d.setDate(d.getDate() + weekOffset * 7 + (targetWeekday - sourceItem.weekday));
    return d;
  }, [sourceDate, weekOffset, targetWeekday, sourceItem.weekday]);

  const conflicts = useMemo(() => {
    return findConflicts(
      schedule,
      targetWeekday,
      targetPeriods,
      { weekday: sourceItem.weekday, periods: sourceItem.periods }
    );
  }, [schedule, targetWeekday, targetPeriods, sourceItem]);

  const hasDuplicate = useMemo(() => {
    return adjustments.some(
      (adj) =>
        adj.type === "move" &&
        adj.sourceWeekday === sourceItem.weekday &&
        arraysEqual(adj.sourcePeriods, sourceItem.periods) &&
        adj.mode === mode &&
        (mode === "once"
          ? (adj.specificWeek ?? adj.startWeek) === targetWeek &&
            (adj.sourceSpecificWeek ?? adj.specificWeek ?? adj.startWeek) === sourceWeek
          : adj.startWeek === targetWeek)
    );
  }, [adjustments, sourceItem, mode, targetWeek, sourceWeek]);

  const maxStartPeriod = 10 - sourceLen + 1;

  const handleConfirm = () => {
    if (targetPeriods.length !== sourceLen) {
      setError("目标节次超出范围");
      return;
    }
    if (
      targetWeekday === sourceItem.weekday &&
      arraysEqual(targetPeriods, sourceItem.periods) &&
      (mode === "longterm" || sourceWeek === targetWeek)
    ) {
      setError("目标位置与源课程相同，请更换星期或节次");
      return;
    }
    if (hasDuplicate) {
      setError("该课程在目标周次已有相同调课记录");
      return;
    }

    const draft: AdjustmentDraft = {
      type: "move",
      sourceWeekday: sourceItem.weekday,
      sourcePeriods: sourceItem.periods,
      targetWeekday,
      targetPeriods,
      mode,
      startWeek: targetWeek,
      specificWeek: mode === "once" ? targetWeek : undefined,
      sourceSpecificWeek: mode === "once" ? sourceWeek : undefined,
    };

    setError(null);
    onConfirm(draft);
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60 backdrop-blur-sm data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0" />
        <Dialog.Popup
          className={
            "fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 " +
            "rounded-[24px] bg-card p-6 shadow-lg ring-1 ring-border outline-none " +
            "data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95"
          }
        >
          <div className="flex items-start justify-between">
            <Dialog.Title className="text-[15px] font-semibold font-display text-foreground">
              调课
            </Dialog.Title>
            <Dialog.Close
              render={<Button size="icon" variant="ghost" className="h-7 w-7" />}
            >
              <X className="w-4 h-4" />
            </Dialog.Close>
          </div>

          <div className="mt-4 space-y-4">
            {/* Source info */}
            <div className="rounded-xl bg-secondary/50 p-3 text-sm">
              <div className="text-muted-foreground text-xs mb-1">源课程</div>
              <div className="font-semibold text-foreground">《{sourceItem.title}》</div>
              <div className="text-muted-foreground text-xs mt-1">
                第 {sourceWeek} 周 · 周{WEEKDAY_LABELS[sourceItem.weekday - 1]} · 第{" "}
                {sourceItem.periods.join("、")} 节
              </div>
            </div>

            {/* Target week */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">目标周次</div>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "本周", offset: 0 },
                  { label: "下周", offset: 1 },
                  { label: "下下周", offset: 2 },
                ].map((opt) => (
                  <Button
                    key={opt.offset}
                    type="button"
                    size="sm"
                    variant={weekOffset === opt.offset ? "default" : "outline"}
                    onClick={() => setWeekOffset(opt.offset)}
                  >
                    {opt.label}
                  </Button>
                ))}
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={targetWeek}
                    onChange={(e) => {
                      const v = parseInt(e.target.value || "1", 10);
                      if (Number.isFinite(v)) setWeekOffset(v - sourceWeek);
                    }}
                    className="h-8 w-20 text-sm"
                  />
                  <span className="text-xs text-muted-foreground">周</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {targetDate.toLocaleDateString("zh-CN", {
                  month: "short",
                  day: "numeric",
                  weekday: "short",
                })}
              </div>
            </div>

            {/* Target weekday */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">目标星期</div>
              <div className="flex gap-1.5">
                {ALL_WEEKDAYS.map((wd) => (
                  <Button
                    key={wd}
                    type="button"
                    size="icon-sm"
                    variant={targetWeekday === wd ? "default" : "outline"}
                    onClick={() => setTargetWeekday(wd)}
                    className="w-9 h-8 text-xs"
                  >
                    {WEEKDAY_LABELS[wd - 1]}
                  </Button>
                ))}
              </div>
            </div>

            {/* Target period */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                目标节次（起始节次，共 {sourceLen} 节）
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ALL_PERIODS.slice(0, maxStartPeriod).map((p) => (
                  <Button
                    key={p}
                    type="button"
                    size="icon-sm"
                    variant={targetStartPeriod === p ? "default" : "outline"}
                    onClick={() => setTargetStartPeriod(p)}
                    className="w-9 h-8 text-xs"
                  >
                    {p}
                  </Button>
                ))}
              </div>
              <div className="text-xs text-muted-foreground">
                第 {targetPeriods.join("、")} 节
              </div>
            </div>

            {/* Mode */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">生效模式</div>
              <div className="flex rounded-lg border border-border p-0.5 w-fit">
                <button
                  type="button"
                  onClick={() => setMode("longterm")}
                  className={`px-3 py-1.5 text-xs rounded-md transition ${
                    mode === "longterm"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  长期
                </button>
                <button
                  type="button"
                  onClick={() => setMode("once")}
                  className={`px-3 py-1.5 text-xs rounded-md transition ${
                    mode === "once"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  单次
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {mode === "once"
                  ? `仅第 ${targetWeek} 周生效`
                  : `从第 ${targetWeek} 周开始长期生效`}
              </p>
            </div>

            {/* Conflicts */}
            {conflicts.length > 0 && (
              <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
                <div className="font-semibold mb-1">目标位置存在冲突：</div>
                <ul className="space-y-0.5">
                  {conflicts.map((c, i) => (
                    <li key={i}>{c.message}</li>
                  ))}
                </ul>
              </div>
            )}

            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close render={<Button variant="secondary" size="sm" />}>
              取消
            </Dialog.Close>
            <Button size="sm" onClick={handleConfirm}>
              保存
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}
