/**
 * 活动追踪引擎 v4 — 全局单例，跨页面导航保持状态
 *
 * Electron: active-win v9 每3秒轮询，窗口切换自动记录
 * Web: 仅检测空闲/离开
 */

"use client";

import { useEffect, useState } from "react";

// ── Types ──
interface WindowInfo { title: string; app: string; timestamp: number; }
export type Category = 'coding' | 'browsing' | 'study' | 'entertainment' | 'communication' | 'system' | 'other';

interface AppSegment {
  app: string; title: string; category: Category;
  domain?: string; project?: string; start: number; end: number;
}
interface ActivityMeta { category: Category; domain?: string; project?: string; }
export interface DayLog { date: string; segments: AppSegment[]; idleMs: number; awayMs: number; }

export const CATEGORY_COLORS: Record<Category, string> = {
  coding: "#22c55e", browsing: "#3b82f6", study: "#8b5cf6",
  entertainment: "#f97316", communication: "#06b6d4", system: "#6b7280", other: "#94a3b8",
};
export const CATEGORY_LABELS: Record<Category, string> = {
  coding: "💻 开发", browsing: "🌐 浏览", study: "📚 学习",
  entertainment: "🎮 娱乐", communication: "💬 通讯", system: "⚙️ 系统", other: "📌 其他",
};

// ElectronAPI 类型已移至 types/globals.d.ts 统一声明

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

const STORAGE_KEY = "sf_activity_v3"; const MAX_DAYS = 7;

function todayKey(): string { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function nowMs() { return Date.now(); }

// ── Storage ──
function loadLog(): DayLog {
  if (typeof window === "undefined") return { date: todayKey(), segments: [], idleMs: 0, awayMs: 0 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const store = JSON.parse(raw);
      const today = todayKey();
      // saveLog 存的是 { "日期": DayLog } 格式
      if (store[today] && store[today].segments) return store[today];
      // 兼容旧格式：顶层直接有 segments
      if (store.segments) return store;
    }
  } catch {}
  return { date: todayKey(), segments: [], idleMs: 0, awayMs: 0 };
}
function saveLog(log: DayLog) {
  try {
    const store: Record<string, DayLog> = {};
    try { const r = localStorage.getItem(STORAGE_KEY); if (r) Object.assign(store, JSON.parse(r)); } catch {}
    store[log.date] = log;
    const keys = Object.keys(store).sort();
    while (keys.length > MAX_DAYS) delete store[keys.shift()!];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {}
}

// ── Global singleton ── survives Next.js page navigation
let _segs: AppSegment[] = [];
let _curApp = "启动中";
let _curTitle = "";
let _curCategory: Category = "system";
const _idle = 0; const _away = 0;
let _subs: Array<() => void> = [];
let _inited = false;
let _latest: ActivityStateV3 | null = null;

function notify() { _latest = null; _subs.forEach(f => f()); }

// ── Smart categorization ──
function categorizeActivity(app: string, title: string): { normalized: string; meta: ActivityMeta } {
  const a = app.toLowerCase(); const t = title.toLowerCase();

  if (a.includes("chrome")||a.includes("edge")||a.includes("firefox")||a.includes("brave")) {
    const browser = a.includes("edge")?"Edge":a.includes("firefox")?"Firefox":"Chrome";
    const domain = extractDomain(title);
    return { normalized: browser, meta: { category: classifyBrowsing(domain, t), domain } };
  }
  if (a.includes("code")||a.includes("visual studio")||a.includes("cursor"))
    return { normalized: "VS Code", meta: { category: "coding", project: extractProject(t) } };
  if (a.includes("terminal")||a.includes("cmd")||a.includes("powershell"))
    return { normalized: "终端", meta: { category: "coding" } };
  if (a.includes("obsidian")) return { normalized: "Obsidian", meta: { category: "study", project: extractObsidianVault(t) } };
  if (a.includes("notion")) return { normalized: "Notion", meta: { category: "study" } };
  if (a.includes("wechat")||a.includes("微信")) return { normalized: "微信", meta: { category: "communication" } };
  if (a.includes("telegram")) return { normalized: "Telegram", meta: { category: "communication" } };
  if (a.includes("feishu")||a.includes("lark")||a.includes("飞书")) return { normalized: "飞书", meta: { category: "communication" } };
  if (a.includes("discord")) return { normalized: "Discord", meta: { category: "communication" } };
  if (a.includes("bilibili")||a.includes("youtube")||a.includes("netflix")||a.includes("iqiyi"))
    return { normalized: "视频", meta: { category: "entertainment" } };
  if (a.includes("steam")||a.includes("原神")||a.includes("genshin"))
    return { normalized: "游戏", meta: { category: "entertainment" } };
  if (a.includes("spotify")||a.includes("网易云")) return { normalized: "音乐", meta: { category: "entertainment" } };
  if (a.includes("matlab")) return { normalized: "MATLAB", meta: { category: "study" } };
  if (a.includes("explorer")||a.includes("文件")) return { normalized: "文件管理", meta: { category: "system" } };
  if (a.includes("github desktop")) return { normalized: "GitHub Desktop", meta: { category: "coding" } };
  if (a.includes("postman")) return { normalized: "Postman", meta: { category: "coding" } };
  return { normalized: app.charAt(0).toUpperCase()+app.slice(1), meta: { category: "other" } };
}

function extractDomain(title: string): string | undefined {
  const m = title.match(/[—–-]\s*([\w-]+\.(com|cn|org|net|io|dev|edu|gov)(\.[a-z]{2})?)\s*[—–-]/);
  return m?.[1];
}
function classifyBrowsing(domain: string|undefined, title: string): Category {
  if (!domain) {
    if (/github|gitlab/i.test(title)) return "coding";
    if (/bilibili|youtube|netflix/i.test(title)) return "entertainment";
    if (/zhihu|csdn|juejin|stackoverflow|medium/i.test(title)) return "study";
    return "browsing";
  }
  if (/github\.com|gitlab\.com|stackoverflow\.com/i.test(domain)) return "coding";
  if (/bilibili\.com|youtube\.com|netflix\.com/i.test(domain)) return "entertainment";
  if (/zhihu\.com|csdn\.net|juejin\.cn|arxiv\.org|wikipedia/i.test(domain)) return "study";
  return "browsing";
}
function extractProject(title: string): string | undefined {
  const m = title.match(/[—–-]\s*(.+?)\s*[—–-]\s*(Visual Studio Code|Cursor|Code)/i);
  if (m?.[1] && !m[1].includes(".")) return m[1];
  return undefined;
}
function extractObsidianVault(title: string): string | undefined {
  const m = title.match(/[—–-]\s*(.+?)\s*[—–-]\s*Obsidian/i);
  return m?.[1];
}

let _flushTimer: ReturnType<typeof setInterval> | null = null;

// ── Init (called once) ──
function init() {
  if (_inited) return;
  const isElectron = !!window.electronAPI?.isElectron;
  if (!isElectron) return;
  _inited = true;
  const log = loadLog();
  _segs = [...log.segments];
  if (_segs.length>0 && _segs[_segs.length-1].end===0) _segs[_segs.length-1].end = nowMs();

  const api = window.electronAPI!;
  api.getActiveWindow().then((win: WindowInfo|null) => {
    if (win) { pushSeg(win); notify(); }
  }).catch(() => {});
  api.onActiveWindowChanged((win: WindowInfo) => {
    pushSeg(win); notify();
  });
  _flushTimer = setInterval(() => {
    if (_segs.length>0 && _segs[_segs.length-1].end===0) _segs[_segs.length-1].end = nowMs();
    saveLog(buildLog());
    _segs.push({ app: _curApp, title: _curTitle, category: _curCategory, start: nowMs(), end: 0 });
  }, 30000);
}

function pushSeg(win: WindowInfo) {
  const { normalized: app, meta } = categorizeActivity(win.app, win.title);
  if (app !== _curApp) {
    if (_segs.length>0 && _segs[_segs.length-1].end===0) _segs[_segs.length-1].end = win.timestamp;
    _segs.push({ app, title: win.title, category: meta.category, domain: meta.domain, project: meta.project, start: win.timestamp, end: 0 });
    _curApp = app; _curTitle = win.title; _curCategory = meta.category;
  }
}

function buildLog(): DayLog {
  return { date: todayKey(), segments: [..._segs], idleMs: _idle, awayMs: _away };
}

function computeState(): ActivityStateV3 {
  const isElectron = typeof window !== "undefined" && !!window.electronAPI?.isElectron;
  const segs = _segs;
  const map: Record<string,number> = {};
  const catMap: Record<string,number> = {};
  let total = 0;
  for (const s of segs) {
    const d = ((s.end||nowMs())-s.start)/60000;
    map[s.app] = (map[s.app]||0)+d;
    catMap[s.category] = (catMap[s.category]||0)+d;
    total += ((s.end||nowMs())-s.start);
  }
  const appBreakdown = Object.entries(map).map(([a,m])=>({app:a,minutes:Math.round(m)})).filter(p=>p.minutes>0).sort((a,b)=>b.minutes-a.minutes);
  const catBreakdown = Object.entries(catMap).map(([c,m])=>({category:c as Category,minutes:Math.round(m),color:CATEGORY_COLORS[c as Category]||CATEGORY_COLORS.other})).sort((a,b)=>b.minutes-a.minutes);

  return {
    currentApp: _curApp, currentTitle: _curTitle,
    appBreakdown, categoryBreakdown: catBreakdown,
    totalActiveMs: total, idleMs: _idle, awayMs: _away,
    todayLog: buildLog(), isElectron,
  };
}

// ── React Hook ──
export interface ActivityStateV3 {
  currentApp: string; currentTitle: string;
  appBreakdown: Array<{app:string;minutes:number}>;
  categoryBreakdown: Array<{category:Category;minutes:number;color:string}>;
  totalActiveMs: number; idleMs: number; awayMs: number;
  todayLog: DayLog; isElectron: boolean;
}

export function useActivityTrackerV3(): ActivityStateV3 {
  const [, tick] = useState(0);
  useEffect(() => {
    init();
    const fn = () => tick(n=>n+1);
    _subs.push(fn);
    return () => {
      _subs = _subs.filter(f=>f!==fn);
      // Cleanup flush timer on unmount
      if (_flushTimer) { clearInterval(_flushTimer); _flushTimer = null; }
      _inited = false; // Allow re-init if component remounts
    };
  }, []);
  return _latest || computeState();
}

export function downloadActivityCSV() {
  const store: Record<string, DayLog> = {};
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) Object.assign(store, JSON.parse(r)); } catch {}
  let csv = "Date,App,Minutes\n";
  for (const [date, log] of Object.entries(store).sort()) {
    if (!log?.segments) continue;
    const map: Record<string,number> = {};
    for (const s of log.segments) {
      const d = ((s.end||nowMs())-s.start)/60000;
      map[s.app] = (map[s.app]||0)+d;
    }
    for (const [app, minutes] of Object.entries(map)) {
      if (minutes < 1) continue;
      csv += `${date},${app},${Math.round(minutes)}\n`;
    }
  }
  const blob = new Blob(["\uFEFF"+csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `activity-${todayKey()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export function clearActivityData() {
  try { localStorage.removeItem(STORAGE_KEY); _segs = []; _latest = null; } catch {}
}
