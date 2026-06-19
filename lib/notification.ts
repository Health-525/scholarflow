import type { ReminderEntry, ReminderStore } from "@/types";

const REMINDERS_KEY = "sf_reminders";

/**
 * 请求通知权限
 */
export async function requestPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return await Notification.requestPermission();
}

/**
 * 检查是否可以设置提醒（距开课时间足够）
 */
export function canSetReminder(startAt: number, minutes: 5 | 10 | 15): boolean {
  const remindAt = startAt - minutes * 60 * 1000;
  return remindAt > Date.now();
}

/**
 * 调度一个课程提醒
 */
export function scheduleReminder(
  key: string,
  entry: ReminderEntry
): void {
  if (typeof window === "undefined") return;

  const delay = entry.remindAt - Date.now();
  if (delay <= 0) return;

  const handle = window.setTimeout(() => {
    if (Notification.permission === "granted") {
      new Notification(`📚 ${entry.courseTitle} 还有 ${entry.minutes} 分钟`, {
        body: entry.location ? `地点：${entry.location}` : "即将开始",
        icon: "/icons/icon-192.png",
      });
    }
    clearReminder(key);
  }, delay) as unknown as number;

  // Save with timer handle
  saveReminder(key, { ...entry, timerHandle: handle });
}

/**
 * 从 localStorage 加载提醒配置
 */
export function loadReminders(): ReminderStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(REMINDERS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ReminderStore;
  } catch {
    return {};
  }
}

/**
 * 保存一条提醒记录
 */
export function saveReminder(key: string, entry: ReminderEntry): void {
  if (typeof window === "undefined") return;
  try {
    const store = loadReminders();
    // Don't persist timerHandle
    const { timerHandle: _, ...rest } = entry;
    store[key] = rest;
    localStorage.setItem(REMINDERS_KEY, JSON.stringify(store));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[Notification] saveReminder failed:", e);
  }
}

/**
 * 清除一条提醒记录
 */
export function clearReminder(key: string): void {
  if (typeof window === "undefined") return;
  try {
    const store = loadReminders();
    if (store[key]) {
      const entry = store[key];
      if (entry.timerHandle) {
        clearTimeout(entry.timerHandle);
      }
      delete store[key];
      localStorage.setItem(REMINDERS_KEY, JSON.stringify(store));
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[Notification] clearReminder failed:", e);
  }
}


