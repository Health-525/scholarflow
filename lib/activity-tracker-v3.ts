/**
 * 屏幕时间前端状态 — Electron 主进程 SQLite 版
 *
 * Electron: 主进程维护状态机并写入 SQLite，渲染进程通过 IPC 查询与订阅。
 * Web: 仅检测环境，返回空状态。
 */

"use client";

import { useEffect, useState } from "react";

import { logger } from "./logger";

// ── Types ──
export type Category = "coding" | "browsing" | "study" | "entertainment" | "communication" | "system" | "other";

interface AppSegment {
  app: string;
  title: string;
  category: Category;
  domain?: string;
  project?: string;
  start: number;
  end: number;
}

export interface DayLog {
  date: string;
  segments: AppSegment[];
  idleMs: number;
  awayMs: number;
}

export interface ScreenTimeState {
  isElectron: boolean;
  currentApp: string;
  currentTitle: string;
  currentCategory?: Category;
  currentSince: number;
  durationSeconds: number;
  totalMinutes: number;
  idleMinutes: number;
  awayMinutes: number;
  categoryBreakdown: Array<{ category: Category; minutes: number; color: string }>;
  appBreakdown: Array<{ app: string; seconds: number; category?: Category }>;
  segments: ActivityDaySummary["segments"];
  loading: boolean;
  paused: boolean;
}

/** @deprecated 保留旧接口名作为别名 */
export interface ActivityStateV3 {
  currentApp: string;
  currentTitle: string;
  appBreakdown: Array<{ app: string; minutes: number }>;
  categoryBreakdown: Array<{ category: Category; minutes: number; color: string }>;
  totalActiveMs: number;
  idleMs: number;
  awayMs: number;
  todayLog: DayLog;
  isElectron: boolean;
}

// ── Constants ──
export const CATEGORY_COLORS: Record<Category, string> = {
  coding: "#22c55e",
  browsing: "#3b82f6",
  study: "#8b5cf6",
  entertainment: "#f97316",
  communication: "#06b6d4",
  system: "#6b7280",
  other: "#94a3b8",
};

export const CATEGORY_LABELS: Record<Category, string> = {
  coding: "💻 开发",
  browsing: "🌐 浏览",
  study: "📚 学习",
  entertainment: "🎮 娱乐",
  communication: "💬 通讯",
  system: "⚙️ 系统",
  other: "📌 其他",
};

export const CATEGORY_SEMANTIC: Record<Category, "success" | "info" | "primary" | "warning"> = {
  coding: "success",
  browsing: "info",
  study: "primary",
  entertainment: "warning",
  communication: "info",
  system: "warning",
  other: "info",
};

// ── Helpers ──
function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nowMs() {
  return Date.now();
}

function isElectron(): boolean {
  return typeof window !== "undefined" && !!window.electronAPI?.isElectron;
}

function mapSegment(s: ActivityDaySummary["segments"][number]): AppSegment {
  return {
    app: s.app || "",
    title: s.title || "",
    category: (s.category || "other") as Category,
    domain: s.domain ?? undefined,
    project: s.project ?? undefined,
    start: s.beginAt,
    end: s.endAt ?? nowMs(),
  };
}

async function queryDaySummary(dateStr: string): Promise<ActivityDaySummary | null> {
  const api = window.electronAPI;
  if (!api?.queryActivityDay) return null;
  try {
    return await api.queryActivityDay(dateStr);
  } catch (e) {
    // eslint-disable-next-line no-console
    logger.error("[ScreenTime] queryActivityDay failed:", e);
    return null;
  }
}

async function fetchCurrentState(): Promise<ActivityStateInfo | null> {
  const api = window.electronAPI;
  if (!api?.getActivityState) return null;
  try {
    return await api.getActivityState();
  } catch (e) {
    // eslint-disable-next-line no-console
    logger.error("[ScreenTime] getActivityState failed:", e);
    return null;
  }
}

function buildEmptyState(): ScreenTimeState {
  return {
    isElectron: false,
    currentApp: "",
    currentTitle: "",
    currentSince: 0,
    durationSeconds: 0,
    totalMinutes: 0,
    idleMinutes: 0,
    awayMinutes: 0,
    categoryBreakdown: [],
    appBreakdown: [],
    segments: [],
    loading: false,
    paused: false,
  };
}

function buildState(
  summary: ActivityDaySummary | null,
  current: ActivityStateInfo | null
): ScreenTimeState {
  const electron = isElectron();
  const segments = summary?.segments ?? [];
  const appMap: Record<string, { seconds: number; category?: Category }> = {};
  const catMap: Record<Category, number> = {
    coding: 0,
    browsing: 0,
    study: 0,
    entertainment: 0,
    communication: 0,
    system: 0,
    other: 0,
  };

  let currentApp = "";
  let currentTitle = "";
  let currentCategory: Category | undefined;
  let currentSince = 0;
  let durationSeconds = 0;

  if (current) {
    if (current.state === "paused") {
      currentApp = "已暂停";
      currentSince = current.since;
      durationSeconds = current.durationSeconds;
    } else if (current.state === "active") {
      currentApp = current.app || "未知应用";
      currentTitle = current.title || "";
      currentCategory = (current.category as Category) || "other";
      currentSince = current.since;
      durationSeconds = current.durationSeconds;
    } else if (current.state === "idle") {
      currentApp = "系统空闲";
      currentSince = current.since;
      durationSeconds = current.durationSeconds;
    } else {
      currentApp = "离开";
      currentSince = current.since;
      durationSeconds = current.durationSeconds;
    }
  }

  for (const s of segments) {
    if (s.type !== "app") continue;
    const end = s.endAt ?? nowMs();
    const duration = end - s.beginAt;
    if (duration <= 0) continue;
    const seconds = Math.round(duration / 1000);
    const minutes = Math.round(duration / 60000);
    if (seconds <= 0) continue;

    const app = s.app || "未知应用";
    const category = (s.category || "other") as Category;

    if (appMap[app]) {
      appMap[app].seconds += seconds;
      // 保留出现次数最多的分类（简单策略）
    } else {
      appMap[app] = { seconds, category };
    }
    catMap[category] = (catMap[category] || 0) + minutes;
  }

  const appBreakdown = Object.entries(appMap)
    .map(([app, info]) => ({ app, seconds: info.seconds, category: info.category }))
    .filter((p) => p.seconds > 0)
    .sort((a, b) => b.seconds - a.seconds);

  const categoryBreakdown = (Object.keys(catMap) as Category[])
    .map((category) => ({ category, minutes: catMap[category], color: CATEGORY_COLORS[category] }))
    .filter((c) => c.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);

  return {
    isElectron: electron,
    currentApp,
    currentTitle,
    currentCategory,
    currentSince,
    durationSeconds,
    totalMinutes: summary?.totalMinutes ?? 0,
    idleMinutes: summary?.idleMinutes ?? 0,
    awayMinutes: summary?.awayMinutes ?? 0,
    categoryBreakdown,
    appBreakdown,
    segments,
    loading: false,
    paused: current?.state === "paused" || false,
  };
}

function convertToLegacyV3(state: ScreenTimeState): ActivityStateV3 {
  const today = todayKey();
  const totalActiveMs = state.totalMinutes * 60000;
  const idleMs = state.idleMinutes * 60000;
  const awayMs = state.awayMinutes * 60000;

  return {
    currentApp: state.currentApp,
    currentTitle: state.currentTitle,
    appBreakdown: state.appBreakdown.map((b) => ({ app: b.app, minutes: Math.round(b.seconds / 60) })),
    categoryBreakdown: state.categoryBreakdown,
    totalActiveMs,
    idleMs,
    awayMs,
    todayLog: {
      date: today,
      segments: state.segments.map(mapSegment),
      idleMs,
      awayMs,
    },
    isElectron: state.isElectron,
  };
}

// ── Hooks ──
export function useScreenTime(date?: string): ScreenTimeState {
  const selectedDate = date || todayKey();
  const isToday = selectedDate === todayKey();
  const [state, setState] = useState<ScreenTimeState>(() => ({
    ...buildEmptyState(),
    isElectron: isElectron(),
    loading: isElectron(),
  }));

  useEffect(() => {
    let mounted = true;
    let unsub: (() => void) | null = null;
    let tickTimer: ReturnType<typeof setInterval> | null = null;

    async function refresh() {
      if (!isElectron()) {
        if (mounted) setState((s) => ({ ...s, loading: false, isElectron: false }));
        return;
      }
      const [summary, current] = await Promise.all([
        queryDaySummary(selectedDate),
        isToday ? fetchCurrentState() : Promise.resolve(null),
      ]);
      if (mounted) {
        setState(buildState(summary, current));
      }
    }

    refresh();

    const api = window.electronAPI;
    if (isElectron() && api?.onActivityStateChanged && isToday) {
      unsub = api.onActivityStateChanged(() => {
        refresh();
      });
    }

    tickTimer = setInterval(() => {
      setState((prev) => {
        if (!prev.isElectron || !prev.currentSince) return prev;
        const nextDuration = Math.max(0, Math.round((Date.now() - prev.currentSince) / 1000));
        return { ...prev, durationSeconds: nextDuration };
      });
    }, 1000);

    return () => {
      mounted = false;
      if (unsub) unsub();
      if (tickTimer) clearInterval(tickTimer);
    };
  }, [selectedDate, isToday]);

  return state;
}

export function useScreenTimeRealtime(): {
  currentApp: string;
  currentTitle: string;
  currentCategory?: Category;
  durationSeconds: number;
} {
  const [state, setState] = useState<{ currentApp: string; currentTitle: string; currentCategory?: Category; durationSeconds: number }>({
    currentApp: "",
    currentTitle: "",
    durationSeconds: 0,
  });

  useEffect(() => {
    let mounted = true;
    let unsub: (() => void) | null = null;

    async function refresh() {
      const info = await fetchCurrentState();
      if (!mounted || !info) return;
      if (info.state === "active") {
        setState({
          currentApp: info.app || "未知应用",
          currentTitle: info.title || "",
          currentCategory: (info.category as Category) || "other",
          durationSeconds: info.durationSeconds,
        });
      } else if (info.state === "idle") {
        setState({ currentApp: "系统空闲", currentTitle: "", durationSeconds: info.durationSeconds });
      } else {
        setState({ currentApp: "离开", currentTitle: "", durationSeconds: info.durationSeconds });
      }
    }

    refresh();

    const api = window.electronAPI;
    if (isElectron() && api?.onActivityStateChanged) {
      unsub = api.onActivityStateChanged(() => refresh());
    }

    const timer = setInterval(() => {
      setState((prev) => {
        if (!prev.currentApp) return prev;
        return { ...prev, durationSeconds: prev.durationSeconds + 1 };
      });
    }, 1000);

    return () => {
      mounted = false;
      if (unsub) unsub();
      clearInterval(timer);
    };
  }, []);

  return state;
}

/** @deprecated 保留旧接口名作为别名 */
export function useActivityTrackerV3(): ActivityStateV3 {
  return convertToLegacyV3(useScreenTime());
}

// ── Actions ──
export async function downloadActivityCSV(): Promise<void> {
  const api = window.electronAPI;
  if (!api?.queryActivityDay) return;

  const today = new Date();
  let csv = "Date,App,Seconds\n";

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    try {
      const summary = await api.queryActivityDay(dateStr);
      const secondsByApp: Record<string, number> = {};
      for (const s of summary.segments) {
        if (s.type !== "app") continue;
        const end = s.endAt ?? Date.now();
        const duration = end - s.beginAt;
        if (duration <= 0) continue;
        const app = s.app || "未知应用";
        secondsByApp[app] = (secondsByApp[app] || 0) + Math.round(duration / 1000);
      }
      for (const [app, seconds] of Object.entries(secondsByApp)) {
        if (seconds <= 0) continue;
        csv += `${dateStr},${app},${seconds}\n`;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      logger.warn("[activityTracker] export day failed:", err);
    }
  }

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `screen-time-${todayKey()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function clearActivityData(): Promise<void> {
  const api = window.electronAPI;
  if (!api?.clearActivityData) return;
  try {
    await api.clearActivityData();
    // 本地状态由订阅自动刷新
  } catch (e) {
    // eslint-disable-next-line no-console
    logger.error("[ScreenTime] clearActivityData failed:", e);
  }
}
