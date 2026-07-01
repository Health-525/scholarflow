"use client";

import type React from "react";

import type { Category } from "@/lib/activity-tracker-v3";

interface UseActivityHandlersOptions {
  settings: ActivitySettings | null;
  update: (patch: Partial<ActivitySettings>) => Promise<void>;
  excludedInput: string;
  setExcludedInput: (v: string) => void;
  overridePattern: string;
  overrideApp: string;
  overrideCategory: Category;
  setOverridePattern: (v: string) => void;
  setOverrideApp: (v: string) => void;
  setOverrideCategory: (v: Category) => void;
  setRecategorizing: (v: boolean) => void;
}

export function useActivityHandlers({
  settings,
  update,
  excludedInput,
  setExcludedInput,
  overridePattern,
  overrideApp,
  overrideCategory,
  setOverridePattern,
  setOverrideApp,
  setOverrideCategory,
  setRecategorizing,
}: UseActivityHandlersOptions) {
  const handleAddExcluded = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || !excludedInput.trim() || !settings) return;
    const next = new Set(settings.excludedApps.map((a) => a.toLowerCase()));
    next.add(excludedInput.trim().toLowerCase());
    await update({ excludedApps: Array.from(next) });
    setExcludedInput("");
  };

  const handleRemoveExcluded = async (app: string) => {
    if (!settings) return;
    await update({ excludedApps: settings.excludedApps.filter((a) => a.toLowerCase() !== app.toLowerCase()) });
  };

  const handleAddOverride = async () => {
    if (!settings || !overridePattern.trim()) return;
    const pattern = overridePattern.trim();
    const next = settings.appOverrides.filter((o) => o.pattern.toLowerCase() !== pattern.toLowerCase());
    const entry: { pattern: string; category: Category; app?: string } = { pattern, category: overrideCategory };
    const displayApp = overrideApp.trim();
    if (displayApp) entry.app = displayApp;
    next.push(entry);
    await update({ appOverrides: next });
    setOverridePattern(""); setOverrideApp(""); setOverrideCategory("study");
  };

  const handleRemoveOverride = async (pattern: string) => {
    if (!settings) return;
    await update({ appOverrides: settings.appOverrides.filter((o) => o.pattern.toLowerCase() !== pattern.toLowerCase()) });
  };

  const handleCategorizeApp = async (app: string, category: Category) => {
    if (!settings) return;
    const next = settings.appOverrides.filter((o) => o.pattern.toLowerCase() !== app.toLowerCase());
    next.push({ pattern: app, category, app });
    await update({ appOverrides: next });
  };

  const handleRecategorize = async () => {
    const api = window.electronAPI;
    if (!api?.recategorizeActivityData) return;
    setRecategorizing(true);
    try { await api.recategorizeActivityData(); } finally { setRecategorizing(false); }
  };

  return { handleAddExcluded, handleRemoveExcluded, handleAddOverride, handleRemoveOverride, handleCategorizeApp, handleRecategorize };
}
