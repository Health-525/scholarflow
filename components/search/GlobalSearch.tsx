"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Fuse from "fuse.js";
import { useAssignmentsQuery } from "@/hooks/useQueries";
import { useScheduleQuery } from "@/hooks/useQueries";

// ── Types ──────────────────────────────────────────────────
interface SearchResult {
  type: "assignment" | "course" | "report";
  title: string;
  subtitle?: string;
  matchText: string;
  url?: string;
}

// ── Component ──────────────────────────────────────────────
export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { assignments } = useAssignmentsQuery();
  const { data: scheduleData } = useScheduleQuery();
  const schedule = scheduleData?.schedule;

  // 构建搜索索引
  const fuse = useMemo(() => {
    const items: SearchResult[] = [];

    // 作业
    for (const a of assignments) {
      items.push({
        type: "assignment",
        title: `${a.subject} · ${a.title}`,
        subtitle: a.done ? "已完成" : a.deadline ? `截止: ${new Date(a.deadline).toLocaleDateString("zh-CN")}` : "",
        matchText: `${a.subject} ${a.title} ${a.note || ""}`,
        url: "/assignments",
      });
    }

    // 课程
    if (schedule?.courses) {
      for (const c of schedule.courses) {
        items.push({
          type: "course",
          title: c.title,
          subtitle: `${c.location || ""} · ${c.teacher || ""}`,
          matchText: `${c.title} ${c.location || ""} ${c.teacher || ""}`,
          url: "/schedule",
        });
      }
    }

    return new Fuse(items, {
      keys: ["matchText", "title", "subtitle"],
      threshold: 0.4,
      includeMatches: true,
      minMatchCharLength: 1,
    });
  }, [assignments, schedule]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return fuse.search(query.trim()).slice(0, 8);
  }, [query, fuse]);

  // 键盘快捷键 Ctrl+K / Cmd+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 键盘导航
  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIdx]) {
      const result = results[selectedIdx].item;
      if (result.url && typeof window !== "undefined") {
        window.location.href = result.url;
      }
      setIsOpen(false);
      setQuery("");
    }
  }

  // 点击外部关闭
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const typeStyles: Record<string, { color: string; label: string }> = {
    assignment: { color: "var(--status-warning)", label: "作业" },
    course: { color: "var(--accent)", label: "课程" },
    report: { color: "#6446a0", label: "日报" },
  };

  return (
    <>
      {/* 搜索按钮 - 固定在右下角AI和番茄之间 */}
      <button
        onClick={() => { setIsOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="fixed bottom-24 md:bottom-6 right-32 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105"
        style={{
          backgroundColor: "var(--surface-elevated)",
          border: "1px solid var(--border)",
          color: "var(--text-secondary)",
        }}
        aria-label="搜索 (Ctrl+K)"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      </button>

      {/* 搜索弹窗 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
          style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
        >
          <div
            ref={containerRef}
            className="w-[560px] max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden"
            style={{
              backgroundColor: "var(--surface-elevated)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            {/* 输入框 */}
            <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <span className="text-base">🔍</span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelectedIdx(0); }}
                onKeyDown={handleInputKeyDown}
                placeholder="搜索作业、课程..."
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: "var(--text-primary)" }}
                autoComplete="off"
                spellCheck={false}
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="text-xs"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  清除
                </button>
              )}
            </div>

            {/* 结果列表 */}
            <div className="max-h-[360px] overflow-y-auto py-1">
              {results.length === 0 && query && (
                <div className="px-4 py-8 text-center text-sm" style={{ color: "var(--text-tertiary)" }}>
                  未找到匹配结果
                </div>
              )}
              {results.map((result, idx) => {
                const { item } = result;
                const style = typeStyles[item.type] || { color: "var(--text-secondary)", label: item.type };

                return (
                  <a
                    key={`${item.type}:${item.title}`}
                    href={item.url || "#"}
                    onClick={(e) => {
                      e.preventDefault();
                      if (item.url && typeof window !== "undefined") {
                        window.location.href = item.url;
                      }
                      setIsOpen(false);
                      setQuery("");
                    }}
                    className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                      idx === selectedIdx ? "" : ""
                    }`}
                    style={{
                      backgroundColor: idx === selectedIdx ? "var(--surface)" : "transparent",
                      color: "var(--text-primary)",
                    }}
                  >
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0"
                      style={{
                        backgroundColor: style.color + "18",
                        color: style.color,
                      }}
                    >
                      {style.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{item.title}</p>
                      {item.subtitle && (
                        <p className="text-[11px] truncate" style={{ color: "var(--text-tertiary)" }}>
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </a>
                );
              })}
            </div>

            {/* Footer */}
            <div
              className="flex items-center gap-4 px-4 py-2 text-[10px]"
              style={{ borderTop: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}
            >
              <span>↑↓ 导航</span>
              <span>↵ 打开</span>
              <span>Esc 关闭</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
