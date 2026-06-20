"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useSearchStore } from "@/store/search";

/**
 * 全局键盘快捷键
 * - Ctrl/Cmd + 1-7: 导航到各页面
 * - Ctrl/Cmd + 8: 统计
 * - Ctrl/Cmd + K: 全局搜索
 */

type ShortcutAction = {
  key: string;
  ctrl?: boolean;
  action: () => void;
  description: string;
};

function isEditingTarget(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement | null;
  if (!target) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function useKeyboardShortcuts() {
  const router = useRouter();
  const setOpen = useSearchStore((s) => s.setOpen);

  useEffect(() => {
    const shortcuts: ShortcutAction[] = [
      { key: "1", ctrl: true, action: () => router.push("/"), description: "仪表板" },
      { key: "2", ctrl: true, action: () => router.push("/schedule"), description: "课表" },
      { key: "3", ctrl: true, action: () => router.push("/assignments"), description: "作业" },
      { key: "4", ctrl: true, action: () => router.push("/running"), description: "跑步" },
      { key: "5", ctrl: true, action: () => router.push("/notes"), description: "笔记" },
      { key: "6", ctrl: true, action: () => router.push("/reports/daily"), description: "日报" },
      { key: "7", ctrl: true, action: () => router.push("/activity"), description: "屏幕时间" },
      { key: "8", ctrl: true, action: () => router.push("/stats"), description: "统计" },
    ];

    function handleKeyDown(e: KeyboardEvent) {
      if (isEditingTarget(e)) return;

      const mod = e.metaKey || e.ctrlKey;

      // Ctrl/Cmd + K: open global search
      if (mod && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen(true);
        return;
      }

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
  // setOpen 是 zustand 的稳定引用，加入依赖数组消除 lint 警告
  }, [router, setOpen]);
}
