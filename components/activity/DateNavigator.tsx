"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

interface DateNavigatorProps {
  date: string;
  onChange: (date: string) => void;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
  });
}

function formatWeekday(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("zh-CN", { weekday: "long" });
}

export function DateNavigator({ date, onChange }: DateNavigatorProps) {
  const isToday = date === todayStr();

  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onChange(addDays(date, -1))}
        aria-label="前一天"
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      <div className="flex flex-col items-center">
        <span className="text-sm font-semibold text-foreground">
          {formatDateLabel(date)}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatWeekday(date)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(todayStr())}
          disabled={isToday}
          className="text-xs"
        >
          今天
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onChange(addDays(date, 1))}
          aria-label="后一天"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
