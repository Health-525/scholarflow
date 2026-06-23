"use client";

import { FileText, Pencil, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

interface DailyEmptyStateProps {
  dateLabel: string;
  onGenerate: () => void;
  onWrite: () => void;
  generating?: boolean;
}

export function DailyEmptyState({
  dateLabel,
  onGenerate,
  onWrite,
  generating = false,
}: DailyEmptyStateProps) {
  return (
    <div className="flex flex-col items-start pt-10 pb-16">
      <div className="flex items-center gap-3 text-muted-foreground mb-5">
        <FileText className="w-5 h-5 stroke-[1.5]" />
        <span className="text-sm font-medium">{dateLabel} 还没有日报</span>
      </div>

      <p className="text-sm text-text-secondary leading-relaxed max-w-md mb-8">
        记录今天的课程、作业与思考。可以让 AI 根据课表、公告和屏幕时间自动生成，也可以手动书写。
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={onGenerate}
          disabled={generating}
          className="gap-2 h-9 px-4 text-sm font-medium"
        >
          <Sparkles className="w-4 h-4" />
          {generating ? "生成中..." : "AI 生成"}
        </Button>
        <Button
          variant="outline"
          onClick={onWrite}
          disabled={generating}
          className="gap-2 h-9 px-4 text-sm font-medium border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40"
        >
          <Pencil className="w-4 h-4" />
          手动书写
        </Button>
      </div>
    </div>
  );
}
