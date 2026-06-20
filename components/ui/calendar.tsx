"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { DayPicker, type Locale, useDayPicker } from "react-day-picker";
import { zhCN } from "date-fns/locale";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const chineseWeekdays = ["日", "一", "二", "三", "四", "五", "六"];

const chineseLocale: Locale = {
  ...zhCN,
  options: { ...zhCN.options, weekStartsOn: 0 },
};

function CustomCaption() {
  const { months, goToMonth, previousMonth, nextMonth } = useDayPicker();
  const currentMonth = months[0]?.date;

  return (
    <div className="flex items-center justify-between px-1">
      <button
        type="button"
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50"
        )}
        disabled={!previousMonth}
        onClick={() => previousMonth && goToMonth(previousMonth)}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="text-sm font-semibold text-foreground">
        {currentMonth ? `${currentMonth.getFullYear()}年${currentMonth.getMonth() + 1}月` : ""}
      </span>
      <button
        type="button"
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50"
        )}
        disabled={!nextMonth}
        onClick={() => nextMonth && goToMonth(nextMonth)}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={chineseLocale}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col space-y-4",
        month: "space-y-2",
        month_caption: "hidden",
        nav: "hidden",
        month_grid: "w-full border-collapse space-y-0.5",
        weekdays: "flex justify-around",
        weekday: "text-muted-foreground/80 rounded-md w-9 font-medium text-[0.75rem] text-center",
        week: "flex w-full mt-1.5 justify-around",
        day: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-full"
        ),
        range_end: "day-range-end",
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-full shadow-sm shadow-primary/20",
        today: "bg-accent/80 text-accent-foreground font-semibold",
        outside:
          "day-outside text-muted-foreground opacity-40 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        disabled: "text-muted-foreground opacity-40",
        range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      formatters={{
        formatWeekdayName: (date) => {
          return chineseWeekdays[date.getDay()];
        },
      }}
      components={{
        MonthCaption: CustomCaption,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
