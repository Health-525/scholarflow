"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Command, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { GLOBAL_SEARCH_ITEMS } from "@/config/navigation";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useSearchStore } from "@/store/search";


interface SearchItem {
  id: string;
  title: string;
  path: string;
  icon: React.ReactNode;
  keywords?: string[];
}

const ITEMS: SearchItem[] = GLOBAL_SEARCH_ITEMS.map((item) => {
  const Icon = item.icon;
  return {
    id: item.id,
    title: item.searchTitle ?? item.label,
    path: item.href,
    icon: <Icon className="w-4 h-4" />,
    keywords: item.keywords,
  };
});

export function GlobalSearch() {
  const router = useRouter();
  const reducedMotion = usePrefersReducedMotion();
  const open = useSearchStore((s) => s.open);
  const query = useSearchStore((s) => s.query);
  const setQuery = useSearchStore((s) => s.setQuery);
  const reset = useSearchStore((s) => s.reset);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement;
      setQuery("");
      setSelectedIndex(0);
      inputRef.current?.focus();
    }
    return () => {
      if (!open) return;
      const prev = previousActiveElement.current as HTMLElement | null;
      if (prev && typeof prev.focus === "function") {
        prev.focus();
      }
    };
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
