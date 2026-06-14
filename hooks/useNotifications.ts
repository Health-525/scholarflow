"use client";

import { useEffect, useCallback, useRef } from "react";

import { useAssignmentsQuery } from "@/hooks/useQueries";
import { classifyUrgency } from "@/lib/assignment-utils";

/**
 * 浏览器通知系统
 *
 * 在以下情况触发通知：
 * - 作业在 24h 内截止（紧急）
 * - 作业逾期未完成
 * - 每次后台静默检查周期：10分钟
 */

const CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10分钟

function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

async function requestPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

function sendNotification(title: string, body: string, tag?: string) {
  if (!isNotificationSupported() || Notification.permission !== "granted") return;
  new Notification(title, {
    body,
    tag: tag || "scholarflow",
    icon: "/icons/logo.png",
    badge: "/icons/logo.png",
  });
}

export function useNotifications() {
  const { assignments } = useAssignmentsQuery();
  const notifiedIds = useRef<Set<string>>(new Set());
  const permissionGranted = useRef(false);

  // 首次请求权限
  useEffect(() => {
    requestPermission().then((granted) => {
      permissionGranted.current = granted;
    });
  }, []);

  // 周期性检查作业截止时间
  const checkDeadlines = useCallback(() => {
    if (!assignments.length || !permissionGranted.current) return;

    const now = new Date();
    const pending = assignments.filter((a) => !a.done);

    for (const a of pending) {
      const urgency = classifyUrgency(a.deadline, now);
      const id = `deadline:${a.id}`;

      if (urgency === "overdue" && !notifiedIds.current.has(id)) {
        sendNotification(
          "⚠️ 作业逾期",
          `${a.subject} · ${a.title} 已超过截止时间`,
          id
        );
        notifiedIds.current.add(id);
      }

      if (urgency === "urgent" && !notifiedIds.current.has(id)) {
        const deadline = new Date(a.deadline);
        const hours = Math.max(1, Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60)));
        sendNotification(
          "📌 作业即将截止",
          `${a.subject} · ${a.title} — 还剩约${hours}小时`,
          id
        );
        notifiedIds.current.add(id);
      }
    }

    // 清理已完成/已取消的作业的通知记录
    const activeIds = new Set(pending.map((a) => `deadline:${a.id}`));
    for (const id of notifiedIds.current) {
      if (!activeIds.has(id)) notifiedIds.current.delete(id);
    }
  }, [assignments]);

  useEffect(() => {
    // 立即检查一次
    const t0 = setTimeout(checkDeadlines, 5000); // 等页面加载完

    // 定时检查
    const interval = setInterval(checkDeadlines, CHECK_INTERVAL_MS);

    return () => {
      clearTimeout(t0);
      clearInterval(interval);
    };
  }, [checkDeadlines]);
}

/**
 * 通知激活组件 — 挂载到 AppShell 即可自动工作
 */
export function NotificationActivator() {
  useNotifications();
  return null;
}
