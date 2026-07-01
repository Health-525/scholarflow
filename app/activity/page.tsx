"use client";

import { Monitor } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ActivityActions } from "@/components/activity/ActivityActions";
import { ActivityStats } from "@/components/activity/ActivityStats";
import { AppRanking } from "@/components/activity/AppRanking";
import { CategoryBreakdown } from "@/components/activity/CategoryBreakdown";
import { DateNavigator } from "@/components/activity/DateNavigator";
import { TimelineBar } from "@/components/activity/TimelineBar";
import { TrackingSettings } from "@/components/activity/TrackingSettings";
import { TrendChart } from "@/components/activity/TrendChart";
import { useActivityHandlers } from "@/components/activity/useActivityHandlers";
import { useActivitySettings } from "@/components/activity/useActivitySettings";
import { useActivityTrend } from "@/components/activity/useActivityTrend";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { clearActivityData, downloadActivityCSV, useScreenTime } from "@/lib/activity-tracker-v3";
import type { Category } from "@/lib/activity-tracker-v3";
import { todayISO } from "@/lib/date-utils";

const PAGE_HEADER = <PageHeader icon={<Monitor className="size-5 text-primary" />} title="屏幕时间" description="追踪每日桌面应用使用情况" />;

export default function ActivityPage() {
  const router = useRouter();
  const [date, setDate] = useState(todayISO);
  const state = useScreenTime(date);
  const { settings, update, togglePaused, loading: settingsLoading } = useActivitySettings();
  const trendDays = useActivityTrend();
  const reducedMotion = usePrefersReducedMotion();
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [appsExpanded, setAppsExpanded] = useState(false);
  const [recategorizing, setRecategorizing] = useState(false);
  const [excludedInput, setExcludedInput] = useState("");
  const [overridePattern, setOverridePattern] = useState("");
  const [overrideApp, setOverrideApp] = useState("");
  const [overrideCategory, setOverrideCategory] = useState<Category>("study");

  const { handleAddExcluded, handleRemoveExcluded, handleAddOverride, handleRemoveOverride, handleCategorizeApp, handleRecategorize } =
    useActivityHandlers({ settings, update, excludedInput, setExcludedInput, overridePattern, overrideApp, overrideCategory, setOverridePattern, setOverrideApp, setOverrideCategory, setRecategorizing });

  const isToday = date === todayISO();
  const activeMinutes = Math.max(0, state.totalMinutes);
  const hasData = state.totalMinutes > 0 || state.idleMinutes > 0 || state.awayMinutes > 0;

  if (!state.isElectron) {
    return (
      <div className="max-w-3xl mx-auto px-4 pb-24 md:pb-0">
        {PAGE_HEADER}
        <EmptyState icon={Monitor} title="需要 Electron 桌面版" description="Web 浏览器无法检测桌面应用，请在 ScholarFlow 桌面版中查看屏幕时间。" />
        <Button variant="outline" className="w-full mt-4 h-9" onClick={() => router.push("/")}>返回首页</Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pb-24 md:pb-0">
      {PAGE_HEADER}
      <DateNavigator date={date} onChange={setDate} />
      <ActivityStats state={state} isPaused={settings?.paused ?? false} isToday={isToday} reducedMotion={reducedMotion} />

      {/* 时间轴 */}
      <section className="mb-6">
        <div className="mb-2"><h3 className="text-sm font-medium text-foreground/70">24 小时时间轴</h3></div>
        <Card><CardContent className="p-4">
          {hasData ? <TimelineBar segments={state.segments} dateStr={date} /> : (
            <div className="h-20 flex items-center justify-center text-xs text-muted-foreground rounded-lg bg-muted/60 border border-dashed border-border">
              今天还没有记录，开始使用电脑后会自动追踪
            </div>
          )}
        </CardContent></Card>
      </section>

      <CategoryBreakdown categoryBreakdown={state.categoryBreakdown} activeMinutes={activeMinutes} />

      {state.appBreakdown.length > 0 && (
        <AppRanking appBreakdown={state.appBreakdown} settings={settings} settingsLoading={settingsLoading}
          appsExpanded={appsExpanded} onToggleExpanded={() => setAppsExpanded((v) => !v)} onCategorize={handleCategorizeApp}
        />
      )}

      <TrendChart trendDays={trendDays} />

      <TrackingSettings
        settings={settings} settingsLoading={settingsLoading} recategorizing={recategorizing}
        excludedInput={excludedInput} overridePattern={overridePattern} overrideApp={overrideApp} overrideCategory={overrideCategory}
        onExcludedInputChange={setExcludedInput} onOverridePatternChange={setOverridePattern}
        onOverrideAppChange={setOverrideApp} onOverrideCategoryChange={setOverrideCategory}
        onAddExcluded={handleAddExcluded} onRemoveExcluded={handleRemoveExcluded}
        onAddOverride={handleAddOverride} onRemoveOverride={handleRemoveOverride}
        onTogglePaused={togglePaused} onToggleRecordTitles={() => update({ recordTitles: !settings?.recordTitles })}
        onRecategorize={handleRecategorize}
      />

      <ActivityActions onExport={() => downloadActivityCSV().catch(() => {})} onClear={() => setClearDialogOpen(true)} />

      {isToday && !hasData && !state.loading && (
        <Card className="mb-4 bg-muted/30 border-dashed">
          <CardContent className="py-6 text-center">
            <Monitor className="size-8 mx-auto mb-2 text-muted-foreground/60" />
            <p className="text-sm font-medium">今天还没有记录</p>
            <p className="text-xs text-muted-foreground mt-1">开始使用电脑后会自动追踪屏幕时间</p>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}
        title="清除屏幕时间数据？" description="此操作不可撤销，所有屏幕时间记录将被永久删除。"
        onConfirm={async () => { await clearActivityData(); window.location.reload(); }}
      />
    </div>
  );
}
