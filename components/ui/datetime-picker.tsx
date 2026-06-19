"use client";

import { format, addDays } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import * as React from "react";

import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// ── 日期选择器 ─────────────────────────────────────────────

interface DatePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function fmt(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

const DATE_SHORTCUTS = [
  { label: "今天", fn: () => fmt(new Date()) },
  { label: "明天", fn: () => fmt(addDays(new Date(), 1)) },
  { label: "后天", fn: () => fmt(addDays(new Date(), 2)) },
  { label: "下周一", fn: () => {
    const d = new Date();
    const diff = d.getDay() === 0 ? 1 : 8 - d.getDay();
    return fmt(addDays(d, diff));
  }},
  { label: "下周六", fn: () => {
    const d = new Date();
    const diff = d.getDay() === 0 ? 6 : 13 - d.getDay();
    return fmt(addDays(d, diff));
  }},
  { label: "月底", fn: () => {
    const d = new Date();
    return fmt(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  }},
];

export function DatePicker({
  value,
  onChange,
  placeholder = "选择日期",
  disabled,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const date = value ? new Date(value + "T00:00:00") : undefined;

  const handleSelect = (selected: Date | undefined) => {
    if (selected) {
      onChange?.(format(selected, "yyyy-MM-dd"));
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors hover:border-ring/50 hover:bg-accent/30 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
          !date && "text-muted-foreground",
          className
        )}
      >
        <span className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 shrink-0" />
          {date ? format(date, "yyyy年MM月dd日", { locale: zhCN }) : placeholder}
        </span>
        <ChevronIcon open={open} />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {/* 快捷选项 */}
        <div className="flex flex-wrap gap-1.5 px-3 pt-3">
          {DATE_SHORTCUTS.map((s) => {
            const active = value === s.fn();
            return (
              <button
                key={s.label}
                type="button"
                onClick={() => {
                  onChange?.(s.fn());
                  setOpen(false);
                }}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-all border",
                  active
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-muted/60 text-muted-foreground border-transparent hover:bg-primary/10 hover:text-primary"
                )}
              >
                {s.label}
              </button>
            );
          })}
        </div>
        {/* 日历 */}
        <div className="border-t mt-3">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleSelect}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── 时间选择器 ─────────────────────────────────────────────

interface TimePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const TIME_GROUPS = [
  {
    label: "上午",
    times: [
      { label: "8:00", time: "08:00" },
      { label: "9:00", time: "09:00" },
      { label: "10:00", time: "10:00" },
      { label: "11:00", time: "11:00" },
    ],
  },
  {
    label: "下午",
    times: [
      { label: "14:00", time: "14:00" },
      { label: "15:00", time: "15:00" },
      { label: "16:00", time: "16:00" },
      { label: "17:00", time: "17:00" },
    ],
  },
  {
    label: "晚上",
    times: [
      { label: "19:00", time: "19:00" },
      { label: "20:00", time: "20:00" },
      { label: "21:00", time: "21:00" },
    ],
  },
];

export function TimePicker({
  value,
  onChange,
  placeholder = "选择时间",
  disabled,
  className,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [manualValue, setManualValue] = React.useState(value || "");

  React.useEffect(() => {
    setManualValue(value || "");
  }, [value]);

  const handleManualChange = (v: string) => {
    setManualValue(v);
    if (/^\d{2}:\d{2}$/.test(v)) {
      onChange?.(v);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors hover:border-ring/50 hover:bg-accent/30 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
          !value && "text-muted-foreground",
          className
        )}
      >
        <span className="flex items-center gap-2">
          <Clock className="h-4 w-4 shrink-0" />
          {value || placeholder}
        </span>
        <ChevronIcon open={open} />
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0" align="start">
        <div className="p-3 space-y-3">
          {TIME_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="text-[11px] font-medium text-muted-foreground mb-1.5">
                {group.label}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {group.times.map((t) => {
                  const active = value === t.time;
                  return (
                    <button
                      key={t.time}
                      type="button"
                      onClick={() => {
                        onChange?.(t.time);
                        setManualValue(t.time);
                        setOpen(false);
                      }}
                      className={cn(
                        "py-1.5 rounded-lg text-xs font-medium transition-all border text-center cursor-pointer",
                        active
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-muted/60 text-muted-foreground border-transparent hover:bg-primary/10 hover:text-primary"
                      )}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {/* 手动输入 */}
        <div className="border-t px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground shrink-0">自定义</span>
            <input
              type="time"
              value={manualValue}
              onChange={(e) => handleManualChange(e.target.value)}
              className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}
