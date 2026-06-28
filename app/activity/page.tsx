"use client";

import {
  BookOpen,
  ChevronDown,
  Code,
  Download,
  Eye,
  EyeOff,
  Gamepad2,
  Globe,
  HelpCircle,
  MessageCircle,
  Monitor,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Settings,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { DateNavigator } from "@/components/activity/DateNavigator";
import { TimelineBar } from "@/components/activity/TimelineBar";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import {
  clearActivityData,
  downloadActivityCSV,
  useScreenTime,
} from "@/lib/activity-tracker-v3";
import type { Category } from "@/lib/activity-tracker-v3";
import { cn } from "@/lib/utils";

const CATEGORY_ICON: Record<Category, typeof Code> = {
  coding: Code,
  browsing: Globe,
  study: BookOpen,
  entertainment: Gamepad2,
  communication: MessageCircle,
  system: Settings,
  other: HelpCircle,
};

const CATEGORY_CLASS: Record<Category, { text: string; bg: string; bar: string }> = {
  coding: { text: "text-statusSuccess", bg: "bg-statusSuccess/10", bar: "bg-statusSuccess" },
  browsing: { text: "text-statusInfo", bg: "bg-statusInfo/10", bar: "bg-statusInfo" },
  study: { text: "text-primary", bg: "bg-primary/10", bar: "bg-primary" },
  entertainment: { text: "text-statusWarning", bg: "bg-statusWarning/10", bar: "bg-statusWarning" },
  communication: { text: "text-statusInfo", bg: "bg-statusInfo/10", bar: "bg-statusInfo" },
  system: { text: "text-muted-foreground", bg: "bg-muted", bar: "bg-muted-foreground" },
  other: { text: "text-muted-foreground", bg: "bg-muted", bar: "bg-muted-foreground" },
};

const CATEGORY_LABELS: Record<Category, string> = {
  coding: "开发",
  browsing: "浏览",
  study: "学习",
  entertainment: "娱乐",
  communication: "通讯",
  system: "系统",
  other: "其他",
};

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return `${h}小时 ${m}分钟`;
  return `${m}分钟`;
}

function formatAppDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}分${s}秒`;
}

function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function useActivitySettings() {
  const [settings, setSettings] = useState<ActivitySettings | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const api = window.electronAPI;
    if (!api?.getActivitySettings) return;
    setLoading(true);
    try {
      const s = await api.getActivitySettings();
      setSettings(s);
    } catch {
      // Activity settings load failed silently
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function update(patch: Partial<ActivitySettings>) {
    const api = window.electronAPI;
    if (!api?.updateActivitySettings) return;
    try {
      const s = await api.updateActivitySettings(patch);
      setSettings(s);
    } catch {
      // Activity settings update failed silently
    }
  }

  async function togglePaused() {
    const api = window.electronAPI;
    if (!api?.toggleActivityPaused) return;
    try {
      const s = await api.toggleActivityPaused();
      setSettings(s);
    } catch {
      // Activity settings toggle failed silently
    }
  }

  return { settings, loading, update, togglePaused, reload: load };
}

function useActivityTrend() {
  const [days, setDays] = useState<Array<{ date: string; totalMinutes: number; idleMinutes: number; awayMinutes: number }>>([]);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.queryActivityRange) return;

    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    api
      .queryActivityRange(fmt(start), fmt(end))
      .then(setDays)
      .catch(() => { /* Activity trend load failed silently */ });
  }, []);

  return days;
}

export default function ActivityPage() {
  const router = useRouter();
  const [date, setDate] = useState(todayStr());
  const state = useScreenTime(date);
  const { settings, update, togglePaused, loading: settingsLoading } = useActivitySettings();
  const trendDays = useActivityTrend();
  const reducedMotion = usePrefersReducedMotion();
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [excludedInput, setExcludedInput] = useState("");
  const [overridePattern, setOverridePattern] = useState("");
  const [overrideCategory, setOverrideCategory] = useState<Category>("study");
  const [overrideApp, setOverrideApp] = useState("");
  const [recategorizing, setRecategorizing] = useState(false);

  const isToday = date === todayStr();
  const totalMinutes = state.totalMinutes;
  const activeMinutes = Math.max(0, totalMinutes);
  const hasData = totalMinutes > 0 || state.idleMinutes > 0 || state.awayMinutes > 0;
  const [appsExpanded, setAppsExpanded] = useState(false);
  const displayedApps = appsExpanded ? state.appBreakdown : state.appBreakdown.slice(0, 8);
  const totalAppSeconds = useMemo(
    () => state.appBreakdown.reduce((sum, b) => sum + b.seconds, 0),
    [state.appBreakdown]
  );

  const isPaused = settings?.paused ?? false;

  async function handleAddExcluded(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const value = excludedInput.trim();
    if (!value || !settings) return;
    const next = new Set(settings.excludedApps.map((a) => a.toLowerCase()));
    next.add(value.toLowerCase());
    await update({ excludedApps: Array.from(next) });
    setExcludedInput("");
  }

  async function handleRemoveExcluded(app: string) {
    if (!settings) return;
    await update({
      excludedApps: settings.excludedApps.filter((a) => a.toLowerCase() !== app.toLowerCase()),
    });
  }

  async function handleAddOverride() {
    if (!settings) return;
    const pattern = overridePattern.trim();
    if (!pattern) return;
    const next = settings.appOverrides.filter(
      (o) => o.pattern.toLowerCase() !== pattern.toLowerCase()
    );
    const entry: { pattern: string; category: Category; app?: string } = { pattern, category: overrideCategory };
    const displayApp = overrideApp.trim();
    if (displayApp) entry.app = displayApp;
    next.push(entry);
    await update({ appOverrides: next });
    setOverridePattern("");
    setOverrideApp("");
    setOverrideCategory("study");
  }

  async function handleRemoveOverride(pattern: string) {
    if (!settings) return;
    await update({
      appOverrides: settings.appOverrides.filter(
        (o) => o.pattern.toLowerCase() !== pattern.toLowerCase()
      ),
    });
  }

  async function handleCategorizeApp(app: string, category: Category) {
    if (!settings) return;
    const next = settings.appOverrides.filter(
      (o) => o.pattern.toLowerCase() !== app.toLowerCase()
    );
    next.push({ pattern: app, category, app });
    await update({ appOverrides: next });
  }

  async function handleRecategorize() {
    const api = window.electronAPI;
    if (!api?.recategorizeActivityData) return;
    setRecategorizing(true);
    try {
      await api.recategorizeActivityData();
    } finally {
      setRecategorizing(false);
    }
  }

  if (!state.isElectron) {
    return (
      <div className="max-w-3xl mx-auto px-4 pb-24 md:pb-0">
        <PageHeader
          icon={<Monitor className="size-5 text-primary" />}
          title="屏幕时间"
          description="追踪每日桌面应用使用情况"
        />
        <EmptyState
          icon={Monitor}
          title="需要 Electron 桌面版"
          description="Web 浏览器无法检测桌面应用，请在 ScholarFlow 桌面版中查看屏幕时间。"
        />
        <Button variant="outline" className="w-full mt-4 h-9" onClick={() => router.push("/")}>
          返回首页
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pb-24 md:pb-0">
      <PageHeader
        icon={<Monitor className="size-5 text-primary" />}
        title="屏幕时间"
        description="追踪每日桌面应用使用情况"
      />

      <DateNavigator date={date} onChange={setDate} />

      {/* 核心指标 */}
      <Card className="mb-6 hover:shadow-sm transition-shadow duration-200">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {isToday ? "今日屏幕时间" : "当日屏幕时间"}
              </div>
              <div className="text-2xl font-bold tabular-nums">
                {formatDuration(totalMinutes)}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                前台 {formatDuration(activeMinutes)} · 空闲 {state.idleMinutes}m · 离开 {state.awayMinutes}m
              </div>
            </div>
            {isToday && (
              <div className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Badge variant="secondary" className={cn("h-4 px-1.5 text-xs", isPaused && "text-muted-foreground")}>
                    {isPaused ? "已暂停" : "追踪中"}
                  </Badge>
                  {state.currentApp && (
                    <span className="relative flex size-1.5">
                      {!reducedMotion && (
                        <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-75", isPaused ? "bg-muted-foreground" : "bg-statusSuccess")} />
                      )}
                      <span className={cn("relative inline-flex size-1.5 rounded-full", isPaused ? "bg-muted-foreground" : "bg-statusSuccess")} />
                    </span>
                  )}
                </div>
                <div className="mt-1 text-sm font-medium text-foreground truncate max-w-44">
                  {state.currentApp || "未追踪"}
                </div>
                {state.currentApp && (
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {formatSeconds(state.durationSeconds)}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 时间轴 */}
      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground/70">24 小时时间轴</h3>
        </div>
        <Card>
          <CardContent className="p-4">
            {hasData ? (
              <TimelineBar segments={state.segments} dateStr={date} />
            ) : (
              <div className="h-20 flex items-center justify-center text-xs text-muted-foreground rounded-lg bg-muted/60 border border-dashed border-border">
                今天还没有记录，开始使用电脑后会自动追踪
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* 分类占比 */}
      {state.categoryBreakdown.length > 0 && (
        <section className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground/70">分类占比</h3>
          </div>
          <Card>
            <CardContent className="p-4">
              <div className="h-2 overflow-hidden rounded-full bg-secondary flex mb-4">
                {state.categoryBreakdown.map((c) => {
                  const cls = CATEGORY_CLASS[c.category];
                  const width = Math.min(100, Math.round((c.minutes / Math.max(activeMinutes, 1)) * 100));
                  return (
                    <div
                      key={c.category}
                      className={cn("h-full min-w-[3px]", cls.bar)}
                      style={{ width: `${width}%` }}
                    />
                  );
                })}
              </div>
              <div className="space-y-2">
                {state.categoryBreakdown.map((c) => {
                  const Icon = CATEGORY_ICON[c.category];
                  const cls = CATEGORY_CLASS[c.category];
                  const pct = Math.min(100, Math.round((c.minutes / Math.max(activeMinutes, 1)) * 100));
                  return (
                    <div key={c.category} className="flex items-center gap-3 text-xs hover:bg-muted/30 rounded-md px-2 py-1 -mx-2 transition-colors duration-150 cursor-pointer">
                      <div className={cn("flex size-7 items-center justify-center rounded-lg", cls.bg)}>
                        <Icon className={cn("size-3.5", cls.text)} />
                      </div>
                      <span className="text-foreground font-medium">{CATEGORY_LABELS[c.category]}</span>
                      <div className="flex-1" />
                      <span className="font-medium tabular-nums text-foreground">{c.minutes}分</span>
                      <span className="w-10 text-right tabular-nums text-muted-foreground">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* 应用排行 */}
      {state.appBreakdown.length > 0 && (
        <section className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground/70">应用排行</h3>
            <span className="text-xs text-muted-foreground">{state.appBreakdown.length} 个应用</span>
          </div>
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                {displayedApps.map((b, idx) => {
                  const pct = Math.min(100, Math.round((b.seconds / Math.max(totalAppSeconds, 1)) * 100));
                  const category = b.category || "other";
                  const cls = CATEGORY_CLASS[category];
                  const isUncategorized = category === "other";
                  const rank = idx + 1;
                  const rankBadgeCls =
                    rank === 1
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      : rank === 2
                        ? "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        : rank === 3
                          ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                          : "text-muted-foreground";
                  return (
                    <div key={b.app} className="space-y-1.5">
                      <div className="flex items-center gap-3 text-xs">
                        <span className={cn("w-5 text-center text-[11px] font-medium tabular-nums shrink-0 rounded px-0.5", rank <= 3 && rankBadgeCls)}>
                          {rank}
                        </span>
                        <span className="font-medium text-foreground/80 truncate shrink-0 max-w-32" title={b.app}>
                          {b.app}
                        </span>
                        {isUncategorized ? (
                          <div className="relative">
                            <select
                              value=""
                              onChange={(e) => {
                                const value = e.target.value as Category;
                                if (value) handleCategorizeApp(b.app, value);
                              }}
                              disabled={settingsLoading || !settings}
                              className="h-5 appearance-none rounded border border-input bg-background pl-1.5 pr-4 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                              <option value="">未分类</option>
                              {Object.entries(CATEGORY_LABELS)
                                .filter(([key]) => key !== "other")
                                .map(([key, label]) => (
                                  <option key={key} value={key}>
                                    归为 {label}
                                  </option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-0.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
                          </div>
                        ) : (
                          <Badge variant="secondary" className={cn("h-4 px-1.5 text-xs", cls.bg, cls.text)}>
                            {CATEGORY_LABELS[category]}
                          </Badge>
                        )}
                        <div className="flex-1" />
                        <span className="text-xs text-muted-foreground tabular-nums">{formatAppDuration(b.seconds)}</span>
                        <span className="w-10 text-right tabular-nums text-muted-foreground">{pct}%</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                        <div className="bg-gradient-to-r from-[#3370FF] to-[#3370FF]/70 h-full rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              {state.appBreakdown.length > 8 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-3 h-8 text-xs"
                  onClick={() => setAppsExpanded((v) => !v)}
                >
                  {appsExpanded ? "收起" : `展开全部 (${state.appBreakdown.length})`}
                </Button>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* 近 7 天趋势 */}
      {trendDays.length > 0 && (
        <section className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground/70">近 7 天趋势</h3>
          </div>
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-2 h-28">
                {trendDays.map((day) => {
                  const max = Math.max(1, ...trendDays.map((d) => d.totalMinutes));
                  const h = Math.round((day.totalMinutes / max) * 100);
                  const isMax = day.totalMinutes >= max;
                  const isTodayBar = day.date === todayStr();
                  return (
                    <div key={day.date} className="flex-1 h-full flex flex-col justify-end items-center gap-1">
                      <div className="w-full flex-1 flex items-end justify-center overflow-hidden">
                        <div
                          className={cn(
                            "w-full max-w-10 rounded-t-md hover:opacity-80 transition-opacity cursor-pointer",
                            isMax
                              ? "bg-gradient-to-t from-[#3370FF] to-[#3370FF]/60"
                              : "bg-[#E5E6EB] dark:bg-muted",
                            isTodayBar && "ring-1 ring-[#3370FF]/30"
                          )}
                          style={{ height: `${Math.max(h, 4)}%` }}
                          title={`${day.date}：${formatDuration(day.totalMinutes)}`}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{day.date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* 追踪设置 */}
      <section className="mb-6">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={isPaused ? "default" : "outline"}
                size="sm"
                className="gap-2"
                onClick={togglePaused}
                disabled={settingsLoading}
              >
                {isPaused ? <PlayCircle className="size-4" /> : <PauseCircle className="size-4" />}
                {isPaused ? "恢复追踪" : "暂停追踪"}
              </Button>
              <Button
                variant={settings?.recordTitles ? "outline" : "secondary"}
                size="sm"
                className="gap-2"
                onClick={() => update({ recordTitles: !settings?.recordTitles })}
                disabled={settingsLoading || !settings}
              >
                {settings?.recordTitles ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                {settings?.recordTitles ? "记录窗口标题" : "不记录窗口标题"}
              </Button>
            </div>

            <div>
              <label htmlFor="excluded-apps" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                排除应用（按回车添加）
              </label>
              <Input
                id="excluded-apps"
                placeholder="例如：WeChat、QQ"
                value={excludedInput}
                onChange={(e) => setExcludedInput(e.target.value)}
                onKeyDown={handleAddExcluded}
                disabled={settingsLoading || !settings}
                className="h-9 text-sm"
              />
              {settings && settings.excludedApps.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {settings.excludedApps.map((app) => (
                    <Badge key={app} variant="secondary" className="gap-1 pl-2 pr-1 py-0.5 text-xs font-normal">
                      {app}
                      <button
                        type="button"
                        onClick={() => handleRemoveExcluded(app)}
                        className="rounded-full p-0.5 hover:bg-muted"
                        aria-label={`移除 ${app}`}
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="size-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">应用分类覆盖</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="匹配词：应用名或窗口标题子串"
                  value={overridePattern}
                  onChange={(e) => setOverridePattern(e.target.value)}
                  disabled={settingsLoading || !settings}
                  className="h-9 text-sm flex-1"
                />
                <Input
                  placeholder="显示名称（可选）"
                  value={overrideApp}
                  onChange={(e) => setOverrideApp(e.target.value)}
                  disabled={settingsLoading || !settings}
                  className="h-9 text-sm sm:w-40"
                />
                <div className="relative">
                  <select
                    value={overrideCategory}
                    onChange={(e) => setOverrideCategory(e.target.value as Category)}
                    disabled={settingsLoading || !settings}
                    className="h-9 w-full appearance-none rounded-md border border-input bg-background px-2 pr-7 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="h-9"
                  onClick={handleAddOverride}
                  disabled={settingsLoading || !settings || !overridePattern.trim()}
                >
                  添加
                </Button>
              </div>
              {settings && settings.appOverrides.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {settings.appOverrides.map((o) => (
                    <Badge key={o.pattern} variant="secondary" className="gap-1 pl-2 pr-1 py-0.5 text-xs font-normal">
                      {o.pattern}
                      <span className="text-muted-foreground">→</span>
                      {CATEGORY_LABELS[o.category as Category] || o.category}
                      <button
                        type="button"
                        onClick={() => handleRemoveOverride(o.pattern)}
                        className="rounded-full p-0.5 hover:bg-muted"
                        aria-label={`移除 ${o.pattern}`}
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs mt-3"
                onClick={handleRecategorize}
                disabled={recategorizing || settingsLoading || !settings}
              >
                <RefreshCw className={cn("size-3.5", recategorizing && "animate-spin")} />
                重新校正历史数据
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 操作区 */}
      <div className="flex gap-3 mb-8 border-t border-[#E5E6EB] pt-4 mt-6">
        <Button variant="outline" className="flex-1 h-9 gap-2" onClick={() => downloadActivityCSV().catch(() => {})}>
          <Download className="size-4" />
          导出 CSV
        </Button>
        <Button variant="ghost" className="h-9 gap-2 text-[11px] text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors duration-150" onClick={() => setClearDialogOpen(true)}>
          <Trash2 className="size-4" />
          清除数据
        </Button>
      </div>

      {/* 无数据空状态 */}
      {isToday && !hasData && !state.loading && (
        <Card className="mb-4 bg-muted/30 border-dashed">
          <CardContent className="py-6 text-center">
            <Monitor className="size-8 mx-auto mb-2 text-muted-foreground/60" />
            <div className="text-sm font-medium text-foreground">今天还没有记录</div>
            <div className="text-xs text-muted-foreground mt-1">开始使用电脑后会自动追踪屏幕时间</div>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={clearDialogOpen}
        onOpenChange={setClearDialogOpen}
        title="清除屏幕时间数据？"
        description="此操作不可撤销，所有屏幕时间记录将被永久删除。"
        onConfirm={async () => {
          await clearActivityData();
          window.location.reload();
        }}
      />
    </div>
  );
}
