"use client";

import { ChevronDown, Eye, EyeOff, PauseCircle, PlayCircle, RefreshCw, Tag, X } from "lucide-react";
import React from "react";

import { CATEGORY_LABELS } from "@/components/activity/category-config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Category } from "@/lib/activity-tracker-v3";
import { cn } from "@/lib/utils";

interface TrackingSettingsProps {
  settings: ActivitySettings | null;
  settingsLoading: boolean;
  recategorizing: boolean;
  excludedInput: string;
  overridePattern: string;
  overrideApp: string;
  overrideCategory: Category;
  onExcludedInputChange: (val: string) => void;
  onOverridePatternChange: (val: string) => void;
  onOverrideAppChange: (val: string) => void;
  onOverrideCategoryChange: (val: Category) => void;
  onAddExcluded: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onRemoveExcluded: (app: string) => void;
  onAddOverride: () => void;
  onRemoveOverride: (pattern: string) => void;
  onTogglePaused: () => void;
  onToggleRecordTitles: () => void;
  onRecategorize: () => void;
}

export function TrackingSettings({
  settings,
  settingsLoading,
  recategorizing,
  excludedInput,
  overridePattern,
  overrideApp,
  overrideCategory,
  onExcludedInputChange,
  onOverridePatternChange,
  onOverrideAppChange,
  onOverrideCategoryChange,
  onAddExcluded,
  onRemoveExcluded,
  onAddOverride,
  onRemoveOverride,
  onTogglePaused,
  onToggleRecordTitles,
  onRecategorize,
}: TrackingSettingsProps) {
  const isPaused = settings?.paused ?? false;

  return (
    <section className="mb-6">
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={isPaused ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={onTogglePaused}
              disabled={settingsLoading}
            >
              {isPaused ? <PlayCircle className="size-4" /> : <PauseCircle className="size-4" />}
              {isPaused ? "恢复追踪" : "暂停追踪"}
            </Button>
            <Button
              variant={settings?.recordTitles ? "outline" : "secondary"}
              size="sm"
              className="gap-2"
              onClick={onToggleRecordTitles}
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
              onChange={(e) => onExcludedInputChange(e.target.value)}
              onKeyDown={onAddExcluded}
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
                      onClick={() => onRemoveExcluded(app)}
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
                onChange={(e) => onOverridePatternChange(e.target.value)}
                disabled={settingsLoading || !settings}
                className="h-9 text-sm flex-1"
              />
              <Input
                placeholder="显示名称（可选）"
                value={overrideApp}
                onChange={(e) => onOverrideAppChange(e.target.value)}
                disabled={settingsLoading || !settings}
                className="h-9 text-sm sm:w-40"
              />
              <div className="relative">
                <select
                  value={overrideCategory}
                  onChange={(e) => onOverrideCategoryChange(e.target.value as Category)}
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
                onClick={onAddOverride}
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
                      onClick={() => onRemoveOverride(o.pattern)}
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
              onClick={onRecategorize}
              disabled={recategorizing || settingsLoading || !settings}
            >
              <RefreshCw className={cn("size-3.5", recategorizing && "animate-spin")} />
              重新校正历史数据
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
