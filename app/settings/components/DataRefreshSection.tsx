"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SettingsSection } from "@/components/ui/settings-section";
import { cn } from "@/lib/utils";

interface DataRefreshSectionProps {
  isPending: boolean;
  onRefresh: () => void;
}

export function DataRefreshSection({
  isPending,
  onRefresh,
}: DataRefreshSectionProps) {
  return (
    <SettingsSection
      icon={<RefreshCw className="size-4" />}
      title="数据刷新"
    >
      <p className="text-xs mb-3 text-muted-foreground">
        从学校教务系统重新抓取课表、成绩、考试等数据
      </p>
      <Button
        variant="outline"
        onClick={onRefresh}
        disabled={isPending}
        className="w-full justify-start gap-3 px-3 py-2.5 h-auto text-left text-sm font-normal"
      >
        <RefreshCw
          className={cn(
            "size-4 shrink-0",
            isPending && "animate-spin",
          )}
        />
        <span>{isPending ? "刷新中..." : "从教务系统刷新数据"}</span>
        <span className="ml-auto text-xs text-muted-foreground">
          课表 · 成绩 · 考试
        </span>
      </Button>
    </SettingsSection>
  );
}
