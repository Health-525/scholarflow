"use client";

import { FileText } from "lucide-react";

interface DailyEmptyStateProps {
  dateLabel: string;
}

export function DailyEmptyState({ dateLabel }: DailyEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
        <FileText className="w-6 h-6 text-muted-foreground/70" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">
        {dateLabel} 还没有日报
      </p>
      <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
        点击右上角「生成日报」，AI 会根据课表、作业和屏幕时间自动汇总；也可以手写记录今日思考。
      </p>
    </div>
  );
}
