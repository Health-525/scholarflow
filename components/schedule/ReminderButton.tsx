"use client";

import { useState } from "react";

import { showToast } from "@/components/ui/ToastContainer";
import { useNotification } from "@/hooks/useNotification";
import { canSetReminder, scheduleReminder, clearReminder, loadReminders } from "@/lib/notification";
import type { ReminderEntry } from "@/types";

type Minutes = 5 | 10 | 15;

interface ReminderButtonProps {
  courseKey: string;
  courseTitle: string;
  location?: string;
  startAt: number; // timestamp ms
}

export function ReminderButton({ courseKey, courseTitle, location, startAt }: ReminderButtonProps) {
  const { isGranted, request } = useNotification();
  const [activeMinutes, setActiveMinutes] = useState<Minutes | null>(() => {
    const reminders = loadReminders();
    return (reminders[courseKey]?.minutes ?? null) as Minutes | null;
  });

  async function handleSelect(minutes: Minutes) {
    if (!isGranted) {
      const perm = await request();
      if (perm !== "granted") return;
    }

    if (activeMinutes === minutes) {
      // Toggle off
      clearReminder(courseKey);
      setActiveMinutes(null);
      return;
    }

    if (!canSetReminder(startAt, minutes)) {
      showToast("warning", "距离上课时间太近，无法设置提醒");
      return;
    }

    const entry: ReminderEntry = {
      courseTitle,
      location,
      startAt,
      remindAt: startAt - minutes * 60 * 1000,
      minutes,
    };

    scheduleReminder(courseKey, entry);
    setActiveMinutes(minutes);
  }

  const options: Minutes[] = [5, 10, 15];

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">
        提前提醒：
      </span>
      {options.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => handleSelect(m)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
            activeMinutes === m
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
          aria-pressed={activeMinutes === m}
          aria-label={`提前 ${m} 分钟提醒`}
        >
          {m}分钟
        </button>
      ))}
    </div>
  );
}

export default ReminderButton;
