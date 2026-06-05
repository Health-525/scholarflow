"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * 全局键盘快捷键
 * - Ctrl/Cmd + 1-7: 导航到各页面
 * - Ctrl/Cmd + K: 全局搜索（由GlobalSearch处理）
 * - Ctrl/Cmd + E: 导出 (根据当前页面)
 */

type ShortcutAction = {
  key: string;
  ctrl?: boolean;
  action: () => void;
  description: string;
};

export function useKeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    const shortcuts: ShortcutAction[] = [
      { key: "1", ctrl: true, action: () => router.push("/"), description: "仪表板" },
      { key: "2", ctrl: true, action: () => router.push("/schedule"), description: "课表" },
      { key: "3", ctrl: true, action: () => router.push("/assignments"), description: "作业" },
      { key: "4", ctrl: true, action: () => router.push("/running"), description: "跑步" },
      { key: "5", ctrl: true, action: () => router.push("/notes"), description: "笔记" },
      { key: "6", ctrl: true, action: () => router.push("/reports/daily"), description: "日报" },
      { key: "7", ctrl: true, action: () => router.push("/stats"), description: "统计" },
    ];

    function handleKeyDown(e: KeyboardEvent) {
      // Skip if in input/textarea or if modal is open
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      const mod = e.metaKey || e.ctrlKey;

      for (const sc of shortcuts) {
        if (sc.ctrl && mod && e.key === sc.key) {
          e.preventDefault();
          sc.action();
          return;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);
}
