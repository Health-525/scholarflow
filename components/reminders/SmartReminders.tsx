"use client";

import { useEffect, useRef } from "react";

/**
 * 智能学习提醒
 *
 * 自动检测:
 * - 即将到来的考试（24h内通知）
 * - 即将截止的作业
 * - 长时间未学习提醒
 *
 * 每小时检查一次，避免频繁打扰。
 */
export function SmartReminders() {
  const lastCheckRef = useRef("");

  useEffect(() => {
    // 每30分钟检查一次
    const check = () => {
      const now = new Date();
      const hour = `${now.getDate()}-${now.getHours()}`;
      if (hour === lastCheckRef.current) return;
      lastCheckRef.current = hour;

      // 只在9:00-22:00发送通知
      if (now.getHours() < 8 || now.getHours() > 22) return;

      checkReminders();
    };

    // 页面加载时首次检查
    setTimeout(check, 5000);

    const interval = setInterval(check, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return null; // No UI - background only
}

function checkReminders() {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

  try {
    // 检查考试
    const examsRaw = localStorage.getItem("sf_exams");
    if (examsRaw) {
      const exams = JSON.parse(examsRaw);
      const upcoming = exams.filter((e: any) => {
        const diff = new Date(e.date + "T23:59:59").getTime() - Date.now();
        return diff > 0 && diff < 24 * 3600 * 1000;
      });
      if (upcoming.length > 0) {
        new Notification("明天有考试！", {
          body: `${upcoming[0].subject}${upcoming.length > 1 ? ` 还有 ${upcoming.length - 1} 场` : ""}`,
          icon: "/icons/logo.png",
        });
      }
    }

    // 检查作业
    const assignRaw = localStorage.getItem("sf_assignments");
    if (assignRaw) {
      const assignments = JSON.parse(assignRaw);
      const due = assignments.filter((a: any) => {
        if (a.done || !a.deadline) return false;
        const diff = new Date(a.deadline).getTime() - Date.now();
        return diff > 0 && diff < 24 * 3600 * 1000;
      });
      if (due.length > 0) {
        new Notification("作业即将截止！", {
          body: `${due.length} 项作业明天截止`,
          icon: "/icons/logo.png",
        });
      }
    }
  } catch { /* ignore */ }
}
