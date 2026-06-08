"use client";

import { useEffect, useRef } from "react";
import type { DayItem, CourseView } from "@/lib/schedule/schedule";
import { ReminderButton } from "./ReminderButton";
import { courseColor } from "@/lib/schedule/course-color";

interface CourseDrawerProps {
  item: DayItem | null;
  date: Date;
  onClose: () => void;
}

export function CourseDrawer({ item, date, onClose }: CourseDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!item) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [item, onClose]);

  if (!item) return null;

  const isCourse = item.kind === "course";
  const course = isCourse ? (item as CourseView) : null;
  const colors = courseColor(item.title);

  // Compute startAt timestamp for reminder
  let startAt = 0;
  if (item.timeText) {
    const startStr = item.timeText.split("-")[0].trim();
    const [hours, minutes] = startStr.split(":").map(Number);
    const d = new Date(date);
    d.setHours(hours, minutes, 0, 0);
    startAt = d.getTime();
  }

  const courseKey = `${date.toISOString().slice(0, 10)}-${item.title}`;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] animate-fade-in"
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
              <div
                className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold mb-2"
                style={{ backgroundColor: colors.bg, color: colors.accent }}
              >
                {isCourse ? "课程" : "特殊课程"}
              </div>
              <h2 className="text-lg font-bold font-display text-foreground">
                {item.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              aria-label="关闭"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {item.timeText && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/60">
              <span className="text-lg" aria-hidden="true">🕐</span>
              <div>
                <div className="text-[10px] text-muted-foreground font-medium">时间</div>
                <div className="text-sm font-medium text-foreground">
                  {item.timeText}
                </div>
              </div>
            </div>
          )}

          {item.location && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/60">
              <span className="text-lg" aria-hidden="true">📍</span>
              <div>
                <div className="text-[10px] text-muted-foreground font-medium">地点</div>
                <div className="text-sm font-medium text-foreground">
                  {item.location}
                </div>
              </div>
            </div>
          )}

          {course?.teacher && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/60">
              <span className="text-lg" aria-hidden="true">👨‍🏫</span>
              <div>
                <div className="text-[10px] text-muted-foreground font-medium">教师</div>
                <div className="text-sm font-medium text-foreground">
                  {course.teacher}
                </div>
              </div>
            </div>
          )}

          {course?.periods && course.periods.length > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/60">
              <span className="text-lg" aria-hidden="true">📋</span>
              <div>
                <div className="text-[10px] text-muted-foreground font-medium">节次</div>
                <div className="text-sm font-medium text-foreground">
                  第 {course.periods.join("、")} 节
                </div>
              </div>
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
    </>
  );
}

export default CourseDrawer;
