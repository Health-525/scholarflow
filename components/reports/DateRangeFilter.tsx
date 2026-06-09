"use client";

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
      <input
        type="date"
        value={startDate}
        onChange={(e) => onStartChange(e.target.value)}
        className="px-3 py-1.5 rounded-xl text-xs outline-none bg-card border border-border text-foreground"
        aria-label="开始日期"
      />
      <span className="text-xs text-muted-foreground">
        至
      </span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => onEndChange(e.target.value)}
        className="px-3 py-1.5 rounded-xl text-xs outline-none bg-card border border-border text-foreground"
        aria-label="结束日期"
      />
      {hasFilter && (
        <button
          type="button"
          onClick={onReset}
          className="px-3 py-1.5 rounded-xl text-xs bg-border text-muted-foreground"
          aria-label="清除日期筛选"
        >
          清除
        </button>
      )}
    </div>
  );
}

export default DateRangeFilter;
