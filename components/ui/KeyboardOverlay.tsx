"use client";

import { Keyboard, X } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";

interface ShortcutItem {
  key: string;
  description: string;
  action?: string;
}

const SHORTCUTS: ShortcutItem[] = [
  { key: "Ctrl+1", description: "仪表板", action: "/" },
  { key: "Ctrl+2", description: "课表", action: "/schedule" },
  { key: "Ctrl+3", description: "作业", action: "/assignments" },
  { key: "Ctrl+4", description: "跑步", action: "/running" },
  { key: "Ctrl+5", description: "笔记", action: "/notes" },
  { key: "Ctrl+6", description: "日报", action: "/reports/daily" },
  { key: "Ctrl+7", description: "屏幕时间", action: "/activity" },
  { key: "Ctrl+8", description: "统计", action: "/stats" },
  { key: "Ctrl+K", description: "全局搜索", action: "search" },
  { key: "?", description: "显示快捷键", action: "toggle" },
  { key: "Esc", description: "关闭弹窗", action: "close" },
];

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

export function KeyboardOverlay() {
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName.toLowerCase();
      const isEditing = tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;

      if ((e.key === "?" || e.key === "slash") && !isEditing && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setVisible(prev => !prev);
      }
      if (e.key === "Escape") {
        setVisible(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!visible) return;

    // Move focus into the dialog when it opens.
    closeButtonRef.current?.focus();

    // Keep focus trapped inside the dialog panel.
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [visible]);

  const handleBackdropClick = useCallback(() => {
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyboard-overlay-title"
    >
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        aria-hidden="true"
        onClick={handleBackdropClick}
      />
      <div
        ref={panelRef}
        className="relative max-w-md w-full mx-4 rounded-2xl p-6 bg-card border border-border shadow-lg animate-fade-up"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-primary" />
            <h2 id="keyboard-overlay-title" className="text-[14px] font-semibold text-foreground">快捷键</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => setVisible(false)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            aria-label="关闭快捷键面板"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2">
          {SHORTCUTS.map(s => (
            <div key={s.key} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-secondary/50 transition-colors">
              <span className="text-[12px] text-muted-foreground">{s.description}</span>
              <kbd className="px-2 py-1 rounded-md text-[11px] font-mono font-semibold bg-secondary text-foreground border border-border min-w-[28px] text-center">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-4 text-center">
          按 <kbd className="px-1 py-0.5 rounded text-[9px] font-mono bg-secondary border border-border">?</kbd> 或 <kbd className="px-1 py-0.5 rounded text-[9px] font-mono bg-secondary border border-border">/</kbd> 切换此面板
        </p>
      </div>
    </div>
  );
}
