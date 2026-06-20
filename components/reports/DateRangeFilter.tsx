"use client";

import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  onReset: () => void;
}

export function DateRangeFilter({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  onReset,
}: DateRangeFilterProps) {
  const hasFilter = !!(startDate || endDate);

  return (
    <div
      className="flex items-center gap-2 flex-wrap"
      role="group"
      aria-label="日期范围筛选"
    >
      <Input
        type="date"
        value={startDate}
        onChange={(e) => onStartChange(e.target.value)}
        className="w-auto min-w-[9rem] text-xs"
        aria-label="开始日期"
      />
      <span className="text-xs text-muted-foreground">
        至
      </span>
      <Input
        type="date"
        value={endDate}
        onChange={(e) => onEndChange(e.target.value)}
        className="w-auto min-w-[9rem] text-xs"
        aria-label="结束日期"
      />
      {hasFilter && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onReset}
          aria-label="清除日期筛选"
        >
          <RotateCcw className="mr-1 size-3.5" />
          清除
        </Button>
      )}
    </div>
  );
}

export default DateRangeFilter;
