"use client";

import { useState } from "react";
import { canSetReminder, scheduleReminder, clearReminder, loadReminders } from "@/lib/notification";
import { useNotification } from "@/hooks/useNotification";
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
      alert("距离上课时间太近，无法设置提醒");
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
      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
        提前提醒：
      </span>
      {options.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => handleSelect(m)}
          className="px-3 py-1 rounded-full text-xs font-medium transition-all"
          style={{
            backgroundColor:
              activeMinutes === m ? "var(--accent)" : "var(--border)",
            color: activeMinutes === m ? "#fff" : "var(--text-secondary)",
          }}
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
