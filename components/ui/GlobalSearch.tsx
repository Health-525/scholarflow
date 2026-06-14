"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Search, X, Command, LayoutDashboard, CalendarDays, ClipboardList, Activity, FileText,
  BookOpen, Library, Bot, Timer, TrendingUp, Brain, Target, Clock, Percent, BarChart3,
  Monitor, Settings, Newspaper, Flag,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useSearchStore } from "@/store/search";


interface SearchItem {
  id: string;
  title: string;
  path: string;
  icon: React.ReactNode;
  keywords?: string[];
}

const ITEMS: SearchItem[] = [
  { id: "dashboard", title: "仪表板", path: "/", icon: <LayoutDashboard className="w-4 h-4" />, keywords: ["首页", "home"] },
  { id: "schedule", title: "课表", path: "/schedule", icon: <CalendarDays className="w-4 h-4" />, keywords: ["课程", "课表"] },
  { id: "assignments", title: "作业", path: "/assignments", icon: <ClipboardList className="w-4 h-4" />, keywords: ["作业", "任务", "todo"] },
  { id: "running", title: "阳光长跑", path: "/running", icon: <Activity className="w-4 h-4" />, keywords: ["跑步", "运动"] },
  { id: "exams", title: "考试倒计时", path: "/exams", icon: <Clock className="w-4 h-4" />, keywords: ["考试", "倒计时"] },
  { id: "goals", title: "每日目标", path: "/goals", icon: <Target className="w-4 h-4" />, keywords: ["目标", "习惯"] },
  { id: "notes", title: "笔记", path: "/notes", icon: <FileText className="w-4 h-4" />, keywords: ["笔记", "知识库"] },
  { id: "daily", title: "日报", path: "/reports/daily", icon: <Newspaper className="w-4 h-4" />, keywords: ["日报", "报告"] },
  { id: "weekly", title: "周报", path: "/reports/weekly", icon: <Flag className="w-4 h-4" />, keywords: ["周报", "总结"] },
  { id: "library", title: "图书馆", path: "/library", icon: <Library className="w-4 h-4" />, keywords: ["图书馆", "座位", "选座"] },
  { id: "chat", title: "AI 助手", path: "/chat", icon: <Bot className="w-4 h-4" />, keywords: ["AI", "聊天", "助手"] },
  { id: "pomodoro", title: "番茄钟", path: "/pomodoro", icon: <Timer className="w-4 h-4" />, keywords: ["番茄钟", "专注", "计时器"] },
  { id: "progress", title: "学习进度", path: "/progress", icon: <TrendingUp className="w-4 h-4" />, keywords: ["进度", "统计"] },
  { id: "knowledge", title: "知识画像", path: "/knowledge", icon: <Brain className="w-4 h-4" />, keywords: ["知识", "画像", "技能"] },
  { id: "roadmap", title: "路线图", path: "/roadmap", icon: <BookOpen className="w-4 h-4" />, keywords: ["路线图", "规划"] },
  { id: "activity", title: "屏幕时间", path: "/activity", icon: <Monitor className="w-4 h-4" />, keywords: ["屏幕时间", "使用统计"] },
  { id: "stats", title: "统计", path: "/stats", icon: <BarChart3 className="w-4 h-4" />, keywords: ["统计", "数据"] },
  { id: "gpa", title: "GPA", path: "/gpa", icon: <Percent className="w-4 h-4" />, keywords: ["绩点", "GPA", "成绩"] },
  { id: "settings", title: "设置", path: "/settings", icon: <Settings className="w-4 h-4" />, keywords: ["设置", "配置"] },
];

export function GlobalSearch() {
  const router = useRouter();
  const reducedMotion = usePrefersReducedMotion();
  const open = useSearchStore((s) => s.open);
  const query = useSearchStore((s) => s.query);
  const setQuery = useSearchStore((s) => s.setQuery);
  const reset = useSearchStore((s) => s.reset);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      inputRef.current?.focus();
    }
  }, [open, setQuery]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ITEMS;
    return ITEMS.filter((item) => {
      const haystack = [item.title, ...(item.keywords || [])].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length]);

  const handleSelect = useCallback((item: SearchItem) => {
    router.push(item.path);
    reset();
  }, [router, reset]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = results[selectedIndex];
      if (item) handleSelect(item);
    } else if (e.key === "Escape") {
      e.preventDefault();
      reset();
    }
  }, [results, selectedIndex, handleSelect, reset]);

  useEffect(() => {
    if (!open) return;
    const onDocKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") reset();
    };
    document.addEventListener("keydown", onDocKey);
    return () => document.removeEventListener("keydown", onDocKey);
  }, [open, reset]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="全局搜索"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.15 }}
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
        >
          <motion.div
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.15 }}
            className="absolute inset-0 bg-foreground/20 backdrop-blur-sm cursor-pointer"
            onClick={() => reset()}
            aria-hidden="true"
          />
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ duration: reducedMotion ? 0 : 0.2, ease: "easeOut" }}
            className="relative w-full max-w-lg mx-4 rounded-2xl bg-card border border-border shadow-2xl overflow-hidden"
          >
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
              <Search className="w-5 h-5 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="搜索页面或功能..."
                aria-label="搜索页面或功能"
                className="flex-1 bg-transparent outline-none text-[14px] text-foreground placeholder:text-muted-foreground"
              />
              <div className="flex items-center gap-1.5">
                <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-secondary text-muted-foreground border border-border">
                  <Command className="w-2.5 h-2.5" />K
                </kbd>
                <button
                  type="button"
                  onClick={() => reset()}
                  className="min-h-8 min-w-8 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                  aria-label="关闭搜索"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Results */}
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {results.length === 0 ? (
                <div className="py-8 text-center text-[13px] text-muted-foreground">
                  未找到匹配结果
                </div>
              ) : (
                <div className="space-y-0.5">
                  {results.map((item, index) => {
                    const selected = index === selectedIndex;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                          selected ? "bg-primary/10 text-primary" : "text-foreground hover:bg-secondary/70"
                        }`}
                      >
                        <span className={selected ? "text-primary" : "text-muted-foreground"}>{item.icon}</span>
                        <span className="flex-1 text-[13px] font-medium">{item.title}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{item.path}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="hidden sm:flex items-center justify-between px-4 py-2 border-t border-border bg-secondary/30 text-[10px] text-muted-foreground">
              <span>↑↓ 选择 · Enter 跳转 · Esc 关闭</span>
              <span>{results.length} 个结果</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
