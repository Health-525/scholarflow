"use client";

import { FileText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { formatDateCN, formatLocalISO, parseISODate, todayISO } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

interface DailyCalendarSidebarProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  datesWithReport: Set<string>;
}

export function DailyCalendarSidebar({
  selectedDate,
  onSelectDate,
  datesWithReport,
}: DailyCalendarSidebarProps) {
  const today = todayISO();
  const [month, setMonth] = useState<Date>(() => parseISODate(selectedDate) ?? new Date());
  const [timeZone, setTimeZone] = useState<string | undefined>(undefined);

  useEffect(() => {
    const d = parseISODate(selectedDate);
    if (d) setMonth(d);
  }, [selectedDate]);

  useEffect(() => {
    try {
      setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    } catch {
      // ignore
    }
  }, []);

  const recentDates = useMemo(() => {
    return Array.from(datesWithReport).sort((a, b) => b.localeCompare(a)).slice(0, 8);
  }, [datesWithReport]);

  const selectedDateObj = useMemo(() => parseISODate(selectedDate), [selectedDate]);

  return (
    <div className="flex flex-col h-full py-6">
      <div className="px-5 mb-2 flex items-center justify-between">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          日历
        </h2>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          disabled={selectedDate === today}
          onClick={() => onSelectDate(today)}
        >
          今天
        </Button>
      </div>

      <div className="px-4">
        <Calendar
          mode="single"
          month={month}
          onMonthChange={setMonth}
          selected={selectedDateObj}
          onSelect={(date: Date | undefined) => {
            if (date) {
              onSelectDate(formatLocalISO(date));
            }
          }}
          timeZone={timeZone}
          noonSafe
          showOutsideDays={false}
          modifiers={{
            hasReport: (date: Date) => datesWithReport.has(formatLocalISO(date)),
          }}
          modifiersClassNames={{
            hasReport:
              "after:absolute after:bottom-1.5 after:left-1/2 after:-translate-x-1/2 after:h-1.5 after:w-1.5 after:rounded-full after:bg-primary",
          }}
          className="p-0 w-full"
          classNames={{
            months: "flex flex-col w-full",
            month: "space-y-1 w-full",
            month_grid: "w-full border-collapse",
            weekdays: "flex justify-around mb-1",
            weekday:
              "text-muted-foreground/70 w-10 font-medium text-xs text-center",
            week: "flex w-full mt-1 justify-around",
            day: "h-10 w-10 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
            day_button: cn(
              buttonVariants({ variant: "ghost" }),
              "h-10 w-10 p-0 font-normal text-foreground/90 hover:bg-muted/70 hover:text-foreground aria-selected:opacity-100 rounded-full transition-colors"
            ),
            selected:
              "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground font-medium rounded-full shadow-sm",
            today: "text-primary font-semibold",
            outside: "hidden",
            disabled: "text-muted-foreground opacity-40",
            hidden: "invisible",
          }}

        />
      </div>

      <div className="mt-8 px-5 flex-1 overflow-y-auto">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          最近日报
        </h3>
        {recentDates.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无其他日报</p>
        ) : (
          <ul className="space-y-1">
            {recentDates.map((date) => {
              const isSelected = date === selectedDate;
              const isToday = date === today;
              return (
                <li key={date}>
                  <button
                    type="button"
                    onClick={() => onSelectDate(date)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors",
                      isSelected
                        ? "bg-primary/[0.08] text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50 text-left"
                    )}
                  >
                    <FileText className={cn("h-3.5 w-3.5 shrink-0", isSelected ? "text-primary" : "text-text-tertiary")} />
                    <span className="truncate">{formatDateCN(date)}</span>
                    {isToday && (
                      <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        今天
                      </span>
                    )}
                    {isSelected && !isToday && (
                      <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-primary/[0.10] text-primary font-medium">
                        当前
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
