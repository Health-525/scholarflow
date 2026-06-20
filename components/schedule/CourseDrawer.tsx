"use client";

import { Clock, ListChecks, MapPin, User, X } from "lucide-react";
import { useEffect, useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { courseColor } from "@/lib/schedule/course-color";
import type { CourseView, DayItem } from "@/lib/schedule/schedule";
import { formatDateInTimeZone } from "@/lib/schedule/timezone";

import { ReminderButton } from "./ReminderButton";

interface CourseDrawerProps {
  item: DayItem | null;
  date: Date;
  timeZone: string;
  onClose: () => void;
}

const FOCUSABLE_SELECTOR = [
  "button",
  "[href]",
  "input",
  "select",
  "textarea",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

export function CourseDrawer({
  item,
  date,
  timeZone,
  onClose,
}: CourseDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

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

  if (!item) return null;

  const isCourse = item.kind === "course";
  const course = isCourse ? (item as CourseView) : null;
  const colors = courseColor(item.title);

  // Compute startAt timestamp for reminder
  let startAt = 0;
  if (item.timeText && item.timeText.includes("-")) {
    const startStr = item.timeText.split("-")[0].trim();
    const [hours, minutes] = startStr.split(":").map(Number);
    if (Number.isFinite(hours) && Number.isFinite(minutes)) {
      const d = new Date(date);
      d.setHours(hours, minutes, 0, 0);
      const t = d.getTime();
      if (Number.isFinite(t)) startAt = t;
    }
  }

  const courseKey = `${formatDateInTimeZone(date, timeZone)}-${item.title}`;

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
