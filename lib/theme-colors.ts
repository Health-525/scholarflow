/**
 * Theme-aware color utilities — single source of truth for dark/light mode colors
 * Centralizes isDark detection and color mapping used across the app
 */

/**
 * Detect if dark mode is currently active
 */
export function isDarkMode(): boolean {
  if (typeof window === "undefined") return false;
  return document.documentElement.getAttribute("data-theme") === "dark"
    || (document.documentElement.getAttribute("data-theme") !== "light"
        && window.matchMedia("(prefers-color-scheme: dark)").matches);
}

// ── Status / occupancy colors ──
export function statusColor(pct: number): string {
  const dark = isDarkMode();
  if (pct >= 90) return dark ? "#f85149" : "#ef4444";
  if (pct >= 70) return dark ? "#d29922" : "#f59e0b";
  return dark ? "#3fb950" : "#22c55e";
}

export function statusColorBg(pct: number): string {
  const dark = isDarkMode();
  if (pct >= 90) return dark ? "rgba(248,81,73,0.14)" : "rgba(239,68,68,0.10)";
  if (pct >= 70) return dark ? "rgba(210,153,34,0.14)" : "rgba(245,158,11,0.10)";
  return dark ? "rgba(63,185,80,0.14)" : "rgba(34,197,94,0.10)";
}

// ── Library reserve status colors ──
export interface ReserveStatusStyle { label: string; color: string; bg: string }

export function getReserveStatusMap(): Record<number, ReserveStatusStyle> {
  const dark = isDarkMode();
  if (dark) {
    return {
      1: { label: "已预约", color: "#7c8edb", bg: "rgba(124,142,219,0.14)" },
      2: { label: "使用中", color: "#3fb950", bg: "rgba(63,185,80,0.14)" },
      3: { label: "已签退", color: "#8b949e", bg: "rgba(139,148,158,0.10)" },
      4: { label: "已取消", color: "#f85149", bg: "rgba(248,81,73,0.14)" },
      5: { label: "已超时", color: "#d29922", bg: "rgba(210,153,34,0.14)" },
    };
  }
  return {
    1: { label: "已预约", color: "#3b82f6", bg: "rgba(59,130,246,0.10)" },
    2: { label: "使用中", color: "#22c55e", bg: "rgba(34,197,94,0.10)" },
    3: { label: "已签退", color: "#94a3b8", bg: "rgba(148,163,184,0.10)" },
    4: { label: "已取消", color: "#ef4444", bg: "rgba(239,68,68,0.10)" },
    5: { label: "已超时", color: "#f59e0b", bg: "rgba(245,158,11,0.10)" },
  };
}

// ── GPA score range colors ──
export interface ScoreRange { label: string; sub: string; min: number; max: number; color: string; bg: string }

export function getScoreRanges(): ScoreRange[] {
  const dark = isDarkMode();
  if (dark) {
    return [
      { label: "优秀", sub: "≥90", min: 90, max: 101, color: "#3fb950", bg: "rgba(63,185,80,0.14)" },
      { label: "良好", sub: "80-89", min: 80, max: 90, color: "#7c8edb", bg: "rgba(124,142,219,0.14)" },
      { label: "中等", sub: "70-79", min: 70, max: 80, color: "#d29922", bg: "rgba(210,153,34,0.14)" },
      { label: "及格", sub: "60-69", min: 60, max: 70, color: "#f85149", bg: "rgba(248,81,73,0.10)" },
      { label: "不及格", sub: "<60", min: 0, max: 60, color: "#f85149", bg: "rgba(248,81,73,0.14)" },
    ];
  }
  return [
    { label: "优秀", sub: "≥90", min: 90, max: 101, color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
    { label: "良好", sub: "80-89", min: 80, max: 90, color: "#2a4494", bg: "rgba(42,68,148,0.10)" },
    { label: "中等", sub: "70-79", min: 70, max: 80, color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
    { label: "及格", sub: "60-69", min: 60, max: 70, color: "#f97316", bg: "rgba(249,115,22,0.08)" },
    { label: "不及格", sub: "<60", min: 0, max: 60, color: "#ef4444", bg: "rgba(239,68,68,0.10)" },
  ];
}

export interface GPARefEntry { range: string; gpa: string; color: string }

export function getGPARef(): GPARefEntry[] {
  const dark = isDarkMode();
  if (dark) {
    return [
      { range: "≥90", gpa: "4.0", color: "#3fb950" },
      { range: "86-89", gpa: "3.7", color: "#3fb950" },
      { range: "82-85", gpa: "3.3", color: "#7c8edb" },
      { range: "79-81", gpa: "3.0", color: "#7c8edb" },
      { range: "75-78", gpa: "2.7", color: "#d29922" },
      { range: "71-74", gpa: "2.3", color: "#d29922" },
      { range: "68-70", gpa: "2.0", color: "#f85149" },
      { range: "60-67", gpa: "1.3", color: "#f85149" },
    ];
  }
  return [
    { range: "≥90", gpa: "4.0", color: "#22c55e" },
    { range: "86-89", gpa: "3.7", color: "#22c55e" },
    { range: "82-85", gpa: "3.3", color: "#2a4494" },
    { range: "79-81", gpa: "3.0", color: "#2a4494" },
    { range: "75-78", gpa: "2.7", color: "#f59e0b" },
    { range: "71-74", gpa: "2.3", color: "#f59e0b" },
    { range: "68-70", gpa: "2.0", color: "#f97316" },
    { range: "60-67", gpa: "1.3", color: "#f97316" },
  ];
}

// ── Generic semantic color helpers ──
export function semanticColor(type: "success" | "warning" | "error" | "info" | "primary"): string {
  const dark = isDarkMode();
  switch (type) {
    case "success":  return dark ? "#3fb950" : "#22c55e";
    case "warning":  return dark ? "#d29922" : "#f59e0b";
    case "error":    return dark ? "#f85149" : "#ef4444";
    case "info":     return dark ? "#7c8edb" : "#2a4494";
    case "primary":  return dark ? "#7c8edb" : "#2a4494";
  }
}

export function semanticBg(type: "success" | "warning" | "error" | "info" | "primary"): string {
  const dark = isDarkMode();
  switch (type) {
    case "success":  return dark ? "rgba(63,185,80,0.14)" : "rgba(34,197,94,0.10)";
    case "warning":  return dark ? "rgba(210,153,34,0.14)" : "rgba(245,158,11,0.10)";
    case "error":    return dark ? "rgba(248,81,73,0.14)" : "rgba(239,68,68,0.10)";
    case "info":     return dark ? "rgba(124,142,219,0.14)" : "rgba(42,68,148,0.10)";
    case "primary":  return dark ? "rgba(124,142,219,0.14)" : "rgba(42,68,148,0.10)";
  }
}

export function semanticBorder(type: "success" | "warning" | "error" | "info" | "primary"): string {
  const dark = isDarkMode();
  switch (type) {
    case "success":  return dark ? "rgba(63,185,80,0.22)" : "rgba(34,197,94,0.20)";
    case "warning":  return dark ? "rgba(210,153,34,0.22)" : "rgba(245,158,11,0.20)";
    case "error":    return dark ? "rgba(248,81,73,0.22)" : "rgba(239,68,68,0.20)";
    case "info":     return dark ? "rgba(124,142,219,0.22)" : "rgba(42,68,148,0.20)";
    case "primary":  return dark ? "rgba(124,142,219,0.22)" : "rgba(42,68,148,0.20)";
  }
}