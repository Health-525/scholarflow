"use client";

import {
  Activity,
  BookOpen,
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import {
  CATEGORY_LABELS,
  CATEGORY_SEMANTIC,
  clearActivityData,
  downloadActivityCSV,
  useScreenTime,
} from "@/lib/activity-tracker-v3";
import type { Category } from "@/lib/activity-tracker-v3";
import { semanticBg, semanticColor } from "@/lib/theme-colors";

const CATEGORY_ICON: Record<Category, typeof Code> = {
  coding: Code,
  browsing: Globe,
  study: BookOpen,
  entertainment: Gamepad2,
  communication: MessageCircle,
  system: Settings,
  other: HelpCircle,
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
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[ActivitySettings] load failed:", e);
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
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[ActivitySettings] update failed:", e);
    }
  }

  async function togglePaused() {
    const api = window.electronAPI;
    if (!api?.toggleActivityPaused) return;
    try {
      const s = await api.toggleActivityPaused();
      setSettings(s);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[ActivitySettings] toggle failed:", e);
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
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error("[ActivityTrend] load failed:", e);
      });
  }, []);

  return days;
}

export default function ActivityPage() {
  const router = useRouter();
  const [date, setDate] = useState(todayStr());
  const state = useScreenTime(date);
  const { settings, update, togglePaused, loading: settingsLoading } = useActivitySettings();
  const trendDays = useActivityTrend();
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
  const displayedApps = appsExpanded
    ? state.appBreakdown
    : state.appBreakdown.slice(0, 10);
  const totalAppSeconds = useMemo(
    () => state.appBreakdown.reduce((sum, b) => sum + b.seconds, 0),
    [state.appBreakdown]
  );

  const isPaused = settings?.paused ?? false;

  const statusColor = useMemo(() => {
    if (isPaused) return semanticColor("warning");
    if (state.currentApp === "系统空闲") return semanticColor("warning");
    if (state.currentApp === "离开") return semanticColor("info");
    return semanticColor("success");
  }, [isPaused, state.currentApp]);

  const statusBg = useMemo(() => {
    if (isPaused) return semanticBg("warning");
    if (state.currentApp === "系统空闲") return semanticBg("warning");
    if (state.currentApp === "离开") return semanticBg("info");
    return semanticBg("success");
  }, [isPaused, state.currentApp]);

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
    const entry: { pattern: string; category: Category; app?: string } = {
      pattern,
      category: overrideCategory,
    };
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
      <div className="max-w-5xl mx-auto pb-24 md:pb-0">
        <PageHeader
          icon={<Monitor className="w-5 h-5 text-primary" />}
          title="屏幕时间"
          description="追踪每日桌面应用使用情况"
        />
        <EmptyState
          icon={Monitor}
          title="需要 Electron 桌面版"
          description="Web 浏览器无法检测桌面应用，请在 ScholarFlow 桌面版中查看屏幕时间。"
        />
        <Button
          variant="outline"
          className="w-full mt-4 h-9"
          onClick={() => router.push("/")}
        >
          返回首页
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-24 md:pb-0">
      <PageHeader
        icon={<Monitor className="w-5 h-5 text-primary" />}
        title="屏幕时间"
        description="追踪每日桌面应用使用情况"
      />

      <DateNavigator date={date} onChange={setDate} />

      {/* ── 核心指标 ── */}
      <Card className="mb-4">
        <CardContent className="p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">
                {isToday ? "今日屏幕时间" : "当日屏幕时间"}
              </div>
              <div className="text-3xl md:text-4xl font-bold tabular-nums text-foreground">
                {formatDuration(totalMinutes)}
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                前台应用 {formatDuration(activeMinutes)} · 空闲 {state.idleMinutes} 分钟 · 离开 {state.awayMinutes} 分钟
              </div>
            </div>
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: semanticBg("primary") }}
            >
              <Activity className="w-6 h-6" style={{ color: semanticColor("primary") }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 实时状态 + 24h 时间轴 ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>实时状态</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-3">
              <span className="relative flex h-3 w-3">
                {!isPaused && (
                  <span
                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                    style={{ backgroundColor: statusColor }}
                  />
                )}
                <span
                  className="relative inline-flex rounded-full h-3 w-3"
                  style={{ backgroundColor: statusColor }}
                />
              </span>
              <span className="text-sm font-medium text-foreground truncate">
                {isPaused ? "已暂停追踪" : state.currentApp || "未追踪"}
              </span>
            </div>
            {state.currentTitle && !isPaused && (
              <div
                className="text-xs text-muted-foreground truncate mb-3"
                title={state.currentTitle}
              >
                {state.currentTitle}
              </div>
            )}
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: statusBg, color: statusColor }}
            >
              {isPaused ? "追踪已暂停" : `已持续 ${formatSeconds(state.durationSeconds)}`}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>24 小时时间轴</CardTitle>
          </CardHeader>
          <CardContent>
            {hasData ? (
              <TimelineBar segments={state.segments} dateStr={date} />
            ) : (
              <div className="h-16 flex items-center justify-center text-xs text-muted-foreground rounded-lg bg-muted/40">
                今天还没有记录，开始使用电脑后会自动追踪
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── 隐私与追踪设置 ── */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>追踪设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Button
              variant={isPaused ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={togglePaused}
              disabled={settingsLoading}
            >
              {isPaused ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
              {isPaused ? "恢复追踪" : "暂停追踪"}
            </Button>
            <Button
              variant={settings?.recordTitles ? "outline" : "secondary"}
              size="sm"
              className="gap-2"
              onClick={() => update({ recordTitles: !settings?.recordTitles })}
              disabled={settingsLoading || !settings}
            >
              {settings?.recordTitles ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {settings?.recordTitles ? "记录窗口标题" : "不记录窗口标题"}
            </Button>
          </div>

          <div>
            <label htmlFor="excluded-apps" className="text-xs text-muted-foreground mb-1.5 block">
              排除应用（不会记录这些应用的活动，按回车添加）
            </label>
            <Input
              id="excluded-apps"
              placeholder="例如：WeChat、QQ、微信"
              value={excludedInput}
              onChange={(e) => setExcludedInput(e.target.value)}
              onKeyDown={handleAddExcluded}
              disabled={settingsLoading || !settings}
              className="h-9 text-sm"
            />
            {settings && settings.excludedApps.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {settings.excludedApps.map((app) => (
                  <Badge
                    key={app}
                    variant="secondary"
                    className="gap-1 pl-2 pr-1 py-0.5 text-xs font-normal"
                  >
                    {app}
                    <button
                      type="button"
                      onClick={() => handleRemoveExcluded(app)}
                      className="rounded-full p-0.5 hover:bg-muted"
                      aria-label={`移除 ${app}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* ── 应用分类覆盖 ── */}
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 mb-2">
              <Tag className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                应用分类覆盖（未识别应用由你决定属于哪类）
              </span>
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
              <select
                value={overrideCategory}
                onChange={(e) => setOverrideCategory(e.target.value as Category)}
                disabled={settingsLoading || !settings}
                className="h-9 text-sm rounded-md border border-input bg-background px-2"
              >
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
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
                  <Badge
                    key={o.pattern}
                    variant="secondary"
                    className="gap-1 pl-2 pr-1 py-0.5 text-xs font-normal"
                  >
                    {o.pattern}
                    <span className="text-muted-foreground">→</span>
                    {CATEGORY_LABELS[o.category as Category] || o.category}
                    <button
                      type="button"
                      onClick={() => handleRemoveOverride(o.pattern)}
                      className="rounded-full p-0.5 hover:bg-muted"
                      aria-label={`移除 ${o.pattern}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex gap-2 mt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={handleRecategorize}
                disabled={recategorizing || settingsLoading || !settings}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${recategorizing ? "animate-spin" : ""}`} />
                重新校正历史数据
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 近 7 天趋势 ── */}
      {trendDays.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>近 7 天趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-28">
              {trendDays.map((day) => {
                const max = Math.max(1, ...trendDays.map((d) => d.totalMinutes));
                const h = Math.round((day.totalMinutes / max) * 100);
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex-1 flex items-end justify-center">
                      <div
                        className="w-full max-w-10 rounded-t-sm bg-primary/80"
                        style={{ height: `${Math.max(h, 4)}%` }}
                        title={`${day.date}：${formatDuration(day.totalMinutes)}`}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {day.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 无数据空状态 ── */}
      {isToday && !hasData && !state.loading && (
        <Card className="mb-4 bg-muted/30 border-dashed">
          <CardContent className="py-6 text-center">
            <Monitor className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" />
            <div className="text-sm font-medium text-foreground">
              今天还没有记录
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              开始使用电脑后会自动追踪屏幕时间
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 分类 breakdown ── */}
      {state.categoryBreakdown.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>分类占比</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Stacked bar */}
            <div className="h-3 rounded-full overflow-hidden flex mb-4 bg-secondary">
              {state.categoryBreakdown.map((c) => (
                <div
                  key={c.category}
                  className="h-full transition-all"
                  style={{
                    width: `${(c.minutes / Math.max(activeMinutes, 1)) * 100}%`,
                    background: semanticColor(CATEGORY_SEMANTIC[c.category]),
                    minWidth: c.minutes > 0 ? 3 : 0,
                  }}
                  title={`${CATEGORY_LABELS[c.category]}: ${c.minutes}分钟`}
                  aria-label={`${CATEGORY_LABELS[c.category]} ${c.minutes}分钟，占比 ${Math.round((c.minutes / Math.max(activeMinutes, 1)) * 100)}%`}
                />
              ))}
            </div>
            {/* Legend list */}
            <div className="space-y-2">
              {state.categoryBreakdown.map((c) => {
                const Icon = CATEGORY_ICON[c.category];
                const pct = Math.round(
                  (c.minutes / Math.max(activeMinutes, 1)) * 100
                );
                return (
                  <div
                    key={c.category}
                    className="flex items-center gap-3 text-xs min-h-8"
                  >
                    <Badge
                      variant="outline"
                      className="gap-1.5 px-2 py-1 text-xs font-normal"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{
                          background: semanticColor(
                            CATEGORY_SEMANTIC[c.category]
                          ),
                        }}
                      />
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-foreground">
                        {CATEGORY_LABELS[c.category]}
                      </span>
                    </Badge>
                    <div className="flex-1" />
                    <span className="font-medium tabular-nums text-foreground">
                      {c.minutes}分
                    </span>
                    <span className="w-12 text-right tabular-nums text-muted-foreground">
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 应用排行 ── */}
      {state.appBreakdown.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>应用排行 ({state.appBreakdown.length})</CardTitle>
              <span className="text-xs text-muted-foreground">
                共检测到 {state.appBreakdown.length} 个前台应用
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {displayedApps.map((b) => {
                const pct = Math.round(
                  (b.seconds / Math.max(totalAppSeconds, 1)) * 100
                );
                const category = b.category || "other";
                const isUncategorized = category === "other";
                const catColor = isUncategorized
                  ? semanticColor("info")
                  : semanticColor(CATEGORY_SEMANTIC[category]);
                const isBusy = settingsLoading || !settings;
                return (
                  <div key={b.app} className="space-y-1.5">
                    <div className="flex items-center gap-3 text-xs">
                      <span
                        className="font-medium text-foreground truncate shrink-0 max-w-32"
                        title={b.app}
                      >
                        {b.app}
                      </span>
                      {isUncategorized ? (
                        <select
                          value=""
                          onChange={(e) => {
                            const value = e.target.value as Category;
                            if (value) handleCategorizeApp(b.app, value);
                          }}
                          disabled={isBusy}
                          className="h-5 text-[10px] rounded border border-input bg-background px-1 py-0"
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
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-xs h-4 px-1.5 font-normal"
                          style={{
                            borderColor: catColor,
                            color: catColor,
                          }}
                        >
                          {CATEGORY_LABELS[category]}
                        </Badge>
                      )}
                      <div className="flex-1" />
                      <span className="tabular-nums text-muted-foreground">
                        {formatAppDuration(b.seconds)}
                      </span>
                      <span className="w-10 text-right tabular-nums text-muted-foreground">
                        {pct}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden bg-secondary">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: catColor }}
                        aria-label={`${b.app} ${formatAppDuration(b.seconds)}，占比 ${pct}%`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {state.appBreakdown.length > 10 && (
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
      )}

      {/* ── 无前台应用提示 ── */}
      {isToday && state.appBreakdown.length === 0 && !state.loading && (
        <Card className="mb-4 bg-muted/30 border-dashed">
          <CardContent className="py-6 text-center">
            <Monitor className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" />
            <div className="text-sm font-medium text-foreground">
              今天还没有检测到前台应用使用记录
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              屏幕时间会记录你每次切换到前台的应用窗口
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 操作区 ── */}
      <div className="flex gap-3 mb-8">
        <Button
          variant="outline"
          className="flex-1 h-9 gap-2"
          onClick={() => downloadActivityCSV().catch(() => {})}
        >
          <Download className="w-4 h-4" />
          导出 CSV
        </Button>
        <Button
          variant="destructive"
          className="h-9 gap-2"
          onClick={() => setClearDialogOpen(true)}
        >
          <Trash2 className="w-4 h-4" />
          清除数据
        </Button>
      </div>

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
