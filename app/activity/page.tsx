"use client";

import {
  Activity,
  BookOpen,
  Code,
  Gamepad2,
  Globe,
  HelpCircle,
  MessageCircle,
  Monitor,
  Settings,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
import {
  CATEGORY_LABELS,
  clearActivityData,
  downloadActivityCSV,
  useActivityTrackerV3,
} from "@/lib/activity-tracker-v3";
import type { Category } from "@/lib/activity-tracker-v3";
import { semanticColor } from "@/lib/theme-colors";

const CATEGORY_SEMANTIC: Record<Category, Parameters<typeof semanticColor>[0]> = {
  coding: "success",
  browsing: "info",
  study: "primary",
  entertainment: "warning",
  communication: "info",
  system: "warning",
  other: "info",
};

const CATEGORY_ICON: Record<Category, typeof Code> = {
  coding: Code,
  browsing: Globe,
  study: BookOpen,
  entertainment: Gamepad2,
  communication: MessageCircle,
  system: Settings,
  other: HelpCircle,
};

export default function ActivityPage() {
  const router = useRouter();
  const state = useActivityTrackerV3();
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const activeMins = Math.round(state.totalActiveMs / 60000);

  if (!state.isElectron) {
    return (
      <div className="max-w-5xl mx-auto pb-24 md:pb-0 animate-page">
        <PageHeader
          icon={<Monitor className="w-5 h-5 text-primary" />}
          title="活动分析"
          description="实时追踪桌面应用使用时间"
        />
        <EmptyState
          icon={Monitor}
          title="需要 Electron 桌面版"
          description="Web 浏览器无法检测桌面应用，请在 ScholarFlow 桌面版中查看活动分析。"
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
    <div className="max-w-5xl mx-auto pb-24 md:pb-0 animate-page">
      <PageHeader
        icon={<Monitor className="w-5 h-5 text-primary" />}
        title="活动分析"
        description="实时追踪桌面应用使用时间"
      />

      {/* ── Big stats ── */}
      <Card className="mb-4">
        <CardContent className="flex flex-col items-center justify-center py-4">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div className="text-[28px] font-bold tabular-nums leading-none text-[var(--status-success)]">
            {activeMins}
          </div>
          <div className="text-[11px] mt-1.5 text-muted-foreground">
            活跃 min（今日）
          </div>
        </CardContent>
      </Card>

      {/* ── Category breakdown ── */}
      {state.categoryBreakdown.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>活动分类</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Stacked bar */}
            <div className="h-3 rounded-full overflow-hidden flex mb-4 bg-secondary">
              {state.categoryBreakdown.map((c) => (
                <div
                  key={c.category}
                  className="h-full transition-all"
                  style={{
                    width: `${(c.minutes / Math.max(activeMins, 1)) * 100}%`,
                    background: semanticColor(CATEGORY_SEMANTIC[c.category]),
                    minWidth: c.minutes > 0 ? 3 : 0,
                  }}
                  title={`${CATEGORY_LABELS[c.category as Category]}: ${c.minutes}min`}
                />
              ))}
            </div>
            {/* Legend list */}
            <div className="space-y-2">
              {state.categoryBreakdown.map((c) => {
                const Icon = CATEGORY_ICON[c.category as Category];
                const pct = Math.round(
                  (c.minutes / Math.max(activeMins, 1)) * 100
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
                        {CATEGORY_LABELS[c.category as Category]}
                      </span>
                    </Badge>
                    <div className="flex-1" />
                    <span className="font-medium tabular-nums text-muted-foreground">
                      {c.minutes}分
                    </span>
                    <span className="w-12 text-right tabular-nums text-muted-foreground/70">
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── ALL apps breakdown ── */}
      {state.appBreakdown.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>全部应用 ({state.appBreakdown.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {state.appBreakdown.map((b) => {
                const pct = Math.round(
                  (b.minutes / Math.max(activeMins, 1)) * 100
                );
                const seg = state.todayLog.segments.find(
                  (s) => s.app === b.app
                );
                const catColor = seg
                  ? semanticColor(CATEGORY_SEMANTIC[seg.category])
                  : semanticColor(CATEGORY_SEMANTIC.other);
                return (
                  <div key={b.app} className="space-y-1.5">
                    <div className="flex items-center gap-3 text-xs">
                      <span
                        className="font-medium text-foreground truncate shrink-0 max-w-[8rem]"
                        title={b.app}
                      >
                        {b.app}
                      </span>
                      <div className="flex-1" />
                      <span className="tabular-nums text-muted-foreground">
                        {b.minutes}分
                      </span>
                      <span className="w-10 text-right tabular-nums text-muted-foreground/70">
                        {pct}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden bg-secondary">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: catColor }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Current tracking status ── */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>实时状态</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 min-h-8">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--status-success)] opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--status-success)]" />
            </span>
            <span className="text-sm font-medium text-foreground">
              {state.currentApp}
            </span>
            {state.currentTitle && (
              <span
                className="text-xs truncate text-muted-foreground"
                title={state.currentTitle}
              >
                — {state.currentTitle.slice(0, 50)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Export / Clear ── */}
      <div className="flex gap-3 mb-8">
        <Button
          variant="outline"
          className="flex-1 h-9"
          onClick={() => downloadActivityCSV().catch(() => {})}
        >
          导出 CSV
        </Button>
        <Button
          variant="destructive"
          className="h-9"
          onClick={() => setClearDialogOpen(true)}
        >
          <Trash2 className="w-4 h-4 mr-1" />
          清除
        </Button>
      </div>

      <ConfirmDialog
        open={clearDialogOpen}
        onOpenChange={setClearDialogOpen}
        title="确定清除所有活动记录？"
        description="此操作不可撤销，所有活动记录将被永久删除。"
        onConfirm={async () => {
          await clearActivityData();
          window.location.reload();
        }}
      />
    </div>
  );
}
