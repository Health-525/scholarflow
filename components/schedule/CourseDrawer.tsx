"use client";

import {
  Clock,
  ListChecks,
  MapPin,
  Pencil,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { AdjustmentDialog } from "@/components/schedule/AdjustmentDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { showToast } from "@/components/ui/ToastContainer";
import type {
  Adjustment,
  AdjustmentDraft,
} from "@/lib/schedule/adjustments";
import { findActiveAdjustment } from "@/lib/schedule/adjustments";
import { courseColor } from "@/lib/schedule/course-color";
import { getWeekNumber } from "@/lib/schedule/schedule";
import type {
  CourseView,
  DayItem,
  RawScheduleData,
} from "@/lib/schedule/schedule";
import { formatDateInTimeZone } from "@/lib/schedule/timezone";

import { ReminderButton } from "./ReminderButton";

interface CourseDrawerProps {
  item: DayItem | null;
  date: Date;
  timeZone: string;
  schedule: RawScheduleData | null;
  adjustments: Adjustment[];
  onClose: () => void;
  onAddAdjustment?: (draft: AdjustmentDraft) => Promise<unknown>;
  onRemoveAdjustment?: (id: string) => Promise<unknown>;
}

const FOCUSABLE_SELECTOR = [
  "button",
  "[href]",
  "input",
  "select",
  "textarea",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];

export function CourseDrawer({
  item,
  date,
  timeZone,
  schedule,
  adjustments,
  onClose,
  onAddAdjustment,
  onRemoveAdjustment,
}: CourseDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);

  useEffect(() => {
    if (!item) return;

    // Save previously focused element and lock background scroll.
    previousActiveElement.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move focus to the first focusable element inside the drawer.
    const drawer = drawerRef.current;
    if (drawer) {
      const focusable = drawer.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      const first = focusable[0];
      if (first) first.focus();
    }

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== "Tab" || !drawer) return;

      const focusable = Array.from(
        drawer.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter(
        (el) =>
          !("disabled" in el && (el as HTMLButtonElement).disabled) &&
          el.offsetParent !== null,
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (active === first || !drawer.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !drawer.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
      // Restore focus if it was moved inside the drawer.
      const prev = previousActiveElement.current as HTMLElement | null;
      if (prev && typeof prev.focus === "function") {
        prev.focus();
      }
    };
  }, [item, onClose]);

  const activeAdj = useMemo(() => {
    if (!schedule || !item || item.kind !== "course") return null;
    const course = item as CourseView;
    const weekNum = getWeekNumber(date, schedule.meta.week1_monday);
    return findActiveAdjustment(adjustments, course, weekNum);
  }, [schedule, item, date, adjustments]);

  const isCourse = item?.kind === "course";
  const course = isCourse ? (item as CourseView) : null;
  const colors = item ? courseColor(item.title) : null;

  // Compute startAt timestamp for reminder
  let startAt = 0;
  if (item?.timeText && item.timeText.includes("-")) {
    const startStr = item.timeText.split("-")[0].trim();
    const [hours, minutes] = startStr.split(":").map(Number);
    if (Number.isFinite(hours) && Number.isFinite(minutes)) {
      const d = new Date(date);
      d.setHours(hours, minutes, 0, 0);
      const t = d.getTime();
      if (Number.isFinite(t)) startAt = t;
    }
  }

  const courseKey = item
    ? `${formatDateInTimeZone(date, timeZone)}-${item.title}`
    : "";

  const handleCancelThisClass = async () => {
    if (!schedule || !course || !onAddAdjustment) return;
    const weekNum = getWeekNumber(date, schedule.meta.week1_monday);
    try {
      await onAddAdjustment({
        type: "cancel",
        sourceWeekday: course.weekday,
        sourcePeriods: course.periods,
        mode: "once",
        startWeek: weekNum,
        specificWeek: weekNum,
      });
      setCancelDialogOpen(false);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "取消课程失败";
      showToast("error", message);
    }
  };

  const handleRemoveAdjustment = async () => {
    if (!activeAdj || !onRemoveAdjustment) return;
    try {
      await onRemoveAdjustment(activeAdj.id);
      setRemoveDialogOpen(false);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "撤销调课失败";
      showToast("error", message);
    }
  };

  if (!item || !colors) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-[var(--overlay)] backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed right-0 top-0 bottom-0 z-50 w-80 max-w-full flex flex-col bg-card border-l border-border shadow-lg animate-fade-up"
        role="dialog"
        aria-modal="true"
        aria-label={`课程详情：${item.title}`}
        style={{ animationDuration: "0.25s" }}
      >
        {/* Header with color accent */}
        <div className="relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{ backgroundColor: colors.accent }}
          />
          <div className="relative px-5 pt-6 pb-4 flex items-start justify-between">
            <div>
              <Badge
                className="mb-2"
                style={{ backgroundColor: colors.bg, color: colors.accent }}
              >
                {isCourse ? "课程" : "特殊课程"}
              </Badge>
              <h2 className="text-lg font-bold font-display text-foreground">
                {item.title}
              </h2>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              aria-label="关闭"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Adjustment status */}
          {activeAdj && (
            <div
              className={
                "rounded-xl px-3 py-2 text-xs " +
                (activeAdj.type === "cancel"
                  ? "bg-destructive/10 text-destructive border border-destructive/20"
                  : "bg-primary/10 text-primary border border-primary/20")
              }
            >
              {activeAdj.type === "cancel"
                ? `本节已取消（第 ${activeAdj.specificWeek ?? activeAdj.startWeek} 周）`
                : `已调至 周${WEEKDAY_LABELS[(activeAdj.targetWeekday ?? 1) - 1]} 第 ${activeAdj.targetPeriods?.join("、")} 节`}
            </div>
          )}

          {item.timeText && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/60">
              <div className="w-5 h-5 flex items-center justify-center text-muted-foreground">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-medium">
                  时间
                </div>
                <div className="text-sm font-medium text-foreground">
                  {item.timeText}
                </div>
              </div>
            </div>
          )}

          {item.location && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/60">
              <div className="w-5 h-5 flex items-center justify-center text-muted-foreground">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-medium">
                  地点
                </div>
                <div className="text-sm font-medium text-foreground">
                  {item.location}
                </div>
              </div>
            </div>
          )}

          {course?.teacher && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/60">
              <div className="w-5 h-5 flex items-center justify-center text-muted-foreground">
                <User className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-medium">
                  教师
                </div>
                <div className="text-sm font-medium text-foreground">
                  {course.teacher}
                </div>
              </div>
            </div>
          )}

          {course?.periods && course.periods.length > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/60">
              <div className="w-5 h-5 flex items-center justify-center text-muted-foreground">
                <ListChecks className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-medium">
                  节次
                </div>
                <div className="text-sm font-medium text-foreground">
                  第 {course.periods.join("、")} 节
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          {isCourse && schedule && onAddAdjustment && (
            <div className="pt-2 space-y-2">
              {!activeAdj ? (
                <>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => setAdjustDialogOpen(true)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    调课
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                    onClick={() => setCancelDialogOpen(true)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    取消本节
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                  onClick={() => setRemoveDialogOpen(true)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  撤销调课
                </Button>
              )}
            </div>
          )}

          {/* Reminder */}
          {startAt > 0 && (
            <div className="pt-3 mt-2 border-t border-border">
              <ReminderButton
                courseKey={courseKey}
                courseTitle={item.title}
                location={item.location}
                startAt={startAt}
              />
            </div>
          )}
        </div>
      </div>

      {isCourse && schedule && course && (
        <AdjustmentDialog
          open={adjustDialogOpen}
          onOpenChange={setAdjustDialogOpen}
          schedule={schedule}
          sourceItem={course}
          sourceDate={date}
          adjustments={adjustments}
          onConfirm={async (draft) => {
            await onAddAdjustment?.(draft);
            setAdjustDialogOpen(false);
            onClose();
          }}
        />
      )}

      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title="取消本节课程"
        description="确定要取消这节课吗？取消后该周次的课表将不再显示此课程，但不会影响其他周次。"
        confirmText="取消本节"
        cancelText="保留"
        danger
        onConfirm={handleCancelThisClass}
      />

      <ConfirmDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        title="撤销调课"
        description="确定要撤销这条调课记录吗？"
        confirmText="撤销"
        cancelText="保留"
        danger
        onConfirm={handleRemoveAdjustment}
      />
    </>
  );
}

export default CourseDrawer;
