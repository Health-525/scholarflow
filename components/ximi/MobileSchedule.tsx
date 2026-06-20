"use client";

import {
  CalendarHeart,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Search,
  Sun,
  Timer,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { CountdownTimer } from "@/components/schedule/CountdownTimer";
import { CourseDrawer } from "@/components/schedule/CourseDrawer";
import { QueryView } from "@/components/schedule/QueryView";
import { Mascot } from "@/components/ximi/Mascot";
import { useScheduleQuery } from "@/hooks/useQueries";
import type { Adjustment } from "@/lib/schedule/adjustments";
import { getAdjustedItemsForDate } from "@/lib/schedule/adjustments";
import { getNextCourse } from "@/lib/schedule/next-course";
import { getWeekNumber } from "@/lib/schedule/schedule";
import type { CourseView, DayItem, RawScheduleData } from "@/lib/schedule/schedule";
import { getNowInTimeZone, normalizeDate } from "@/lib/schedule/timezone";

type Tab = "today" | "week" | "query";

const TABS: { id: Tab; label: string; icon: typeof Sun }[] = [
  { id: "today", label: "今日", icon: Sun },
  { id: "week", label: "本周", icon: CalendarHeart },
  { id: "query", label: "查询", icon: Search },
];

const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];
const ALL_PERIODS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const PERIOD_DIVIDERS: Record<number, string> = { 5: "下午", 9: "晚上" };
const ROW_H = 56;
const HEADER_H = 52;
const LABEL_W = 40;

/** 萌系课程色板：蓝 / 绿 / 粉 / 灰 / 浅粉 轮换（对齐 mockup 的 M3 容器色） */
const CUTE = [
  "bg-secondary-container/55 border-secondary-container/70 text-on-secondary-container",
  "bg-tertiary-container/55 border-tertiary-container/70 text-on-tertiary-container",
  "bg-primary-container/55 border-primary-container/70 text-on-primary-container",
  "bg-surface-variant/70 border-outline-variant text-on-surface-variant",
  "bg-primary-fixed/70 border-primary-fixed-dim/60 text-on-primary-container",
];
function cuteOf(title: string) {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) >>> 0;
  return CUTE[h % CUTE.length];
}

interface CourseBlock {
  item: DayItem;
  firstPeriod: number;
  span: number;
}

/* ───────────────────────── 今日 ───────────────────────── */
function TodayPane({
  schedule,
  adjustments,
}: {
  schedule: RawScheduleData;
  adjustments: Adjustment[];
}) {
  const [selected, setSelected] = useState<DayItem | null>(null);
  const tz = schedule.meta.tz || "Asia/Shanghai";
  const today = useMemo(() => getNowInTimeZone(tz), [tz]);
  const { items } = useMemo(
    () => getAdjustedItemsForDate(schedule, today, adjustments),
    [schedule, today, adjustments],
  );
  const nextCourse = useMemo(
    () => getNextCourse(schedule, today, tz, adjustments),
    [schedule, today, tz, adjustments],
  );
  const weekday = today.toLocaleDateString("zh-CN", { weekday: "long" });
  const dateLabel = today.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });

  return (
    <div className="flex flex-col gap-4">
      {/* Hero：下节课 / 全部结束 */}
      <section className="relative overflow-hidden rounded-[28px] bg-surface-container-lowest p-5 shadow-[0_20px_40px_-20px_rgba(var(--ximi-glow),0.3)]">
        <div className="pointer-events-none absolute inset-0 rounded-[28px] border-[1.5px] border-white/60" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-white bg-primary-container/25">
            <Mascot size="md" float className="!drop-shadow-none" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-[12px] font-medium text-on-surface-variant">
                {weekday} · {dateLabel}
              </span>
              {nextCourse && (
                <span className="rounded-full bg-primary-container px-2.5 py-0.5 text-[11px] font-bold text-on-primary-container">
                  下节课
                </span>
              )}
            </div>
            {nextCourse ? (
              <>
                <h2 className="truncate text-[19px] font-bold text-on-surface">
                  {nextCourse.item.title}
                </h2>
                <p className="mt-0.5 truncate text-[13px] text-on-surface-variant">
                  {nextCourse.item.timeText}
                  {nextCourse.item.location && <span className="ml-1.5">· {nextCourse.item.location}</span>}
                </p>
              </>
            ) : (
              <p className="text-[15px] font-semibold text-on-surface">
                今天的课都上完啦，休息一下喵~
              </p>
            )}
          </div>
        </div>
        {nextCourse && (
          <div className="relative z-10 mt-4 flex items-center gap-3 rounded-2xl bg-primary-container/20 p-3.5">
            <Timer className="h-5 w-5 shrink-0 text-primary" />
            <div className="text-[22px] font-bold tabular-nums text-primary">
              <CountdownTimer targetTime={nextCourse.startTime} label="距离上课" />
            </div>
          </div>
        )}
      </section>

      {/* 今日课程列表 */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[28px] bg-surface-container-lowest py-8">
          <Mascot size="md" />
          <p className="text-[14px] text-on-surface-variant">今天没有课，享受自由时光~</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {items.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelected(item)}
              className={`flex items-center gap-3 rounded-3xl border px-4 py-3.5 text-left transition active:scale-[0.98] ${cuteOf(item.title)}`}
            >
              <span className="h-9 w-1.5 shrink-0 rounded-full bg-current opacity-70" />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-[15px] font-bold">{item.title}</h3>
                <div className="mt-0.5 flex items-center gap-3 text-[12px] opacity-80">
                  {item.timeText && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {item.timeText}
                    </span>
                  )}
                  {item.location && (
                    <span className="flex min-w-0 items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <CourseDrawer item={selected} date={today} timeZone={tz} onClose={() => setSelected(null)} />
    </div>
  );
}

/* ───────────────────────── 本周 ───────────────────────── */
function WeekPane({
  schedule,
  adjustments,
}: {
  schedule: RawScheduleData;
  adjustments: Adjustment[];
}) {
  const [selected, setSelected] = useState<DayItem | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekOffset, setWeekOffset] = useState(0);
  const tz = schedule.meta.tz || "Asia/Shanghai";

  const weekInfo = useMemo(() => {
    const now = getNowInTimeZone(tz);
    const normalized = normalizeDate(now);
    const jsDay = normalized.getDay();
    const monday = new Date(normalized);
    monday.setDate(normalized.getDate() - (jsDay === 0 ? 6 : jsDay - 1) + weekOffset * 7);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
    const fmt = (d: Date) => d.getMonth() + 1 + "月" + d.getDate() + "日";
    return {
      days,
      label: fmt(days[0]) + " — " + fmt(days[6]),
      weekNum: getWeekNumber(days[0], schedule.meta.week1_monday),
    };
  }, [tz, weekOffset, schedule.meta.week1_monday]);

  const today = useMemo(() => normalizeDate(getNowInTimeZone(tz)), [tz]);

  const dayData = useMemo(
    () =>
      weekInfo.days.map((day) => {
        const { items } = getAdjustedItemsForDate(schedule, day, adjustments);
        const courses: CourseBlock[] = [];
        const specials: DayItem[] = [];
        for (const item of items) {
          if (item.kind === "course") {
            const cv = item as CourseView;
            courses.push({ item, firstPeriod: cv.periods[0], span: cv.periods.length });
          } else {
            specials.push(item);
          }
        }
        return { courses, specials };
      }),
    [schedule, weekInfo.days, adjustments],
  );

  const periodTimes = schedule.periodTimes || {};
  const totalGridH = ALL_PERIODS.length * ROW_H;
  const hasSpecials = dayData.some((d) => d.specials.length > 0);

  return (
    <div className="flex flex-col gap-3">
      {/* 周导航 */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setWeekOffset((w) => w - 1)}
          aria-label="上一周"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-lowest text-primary shadow-[0_4px_12px_rgba(var(--ximi-glow),0.16)] transition active:scale-90"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[14px] font-bold text-on-surface">{weekInfo.label}</span>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="rounded-full bg-primary-container/40 px-2.5 py-0.5 text-[11px] font-semibold text-on-primary-container">
              第 {weekInfo.weekNum} 周
            </span>
            {weekOffset !== 0 && (
              <button
                type="button"
                onClick={() => setWeekOffset(0)}
                className="text-[11px] font-semibold text-primary"
              >
                回到本周
              </button>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setWeekOffset((w) => w + 1)}
          aria-label="下一周"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-lowest text-primary shadow-[0_4px_12px_rgba(var(--ximi-glow),0.16)] transition active:scale-90"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* 网格卡片 */}
      <div className="overflow-hidden rounded-[28px] bg-surface-container-lowest p-2 shadow-[0_12px_32px_-8px_rgba(var(--ximi-glow),0.28)]">
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* 表头 */}
            <div
              className="grid border-b border-outline-variant/40"
              style={{ gridTemplateColumns: `${LABEL_W}px repeat(7, 1fr)`, height: HEADER_H }}
            >
              <div className="flex items-center justify-center text-[9px] text-on-surface-variant">
                节次
              </div>
              {weekInfo.days.map((day, idx) => {
                const isToday = normalizeDate(day).getTime() === today.getTime();
                const isWeekend = idx >= 5;
                return (
                  <div key={idx} className="flex flex-col items-center justify-center gap-0.5">
                    <span
                      className={
                        "text-[10px] font-medium " +
                        (isWeekend ? "text-primary/60" : "text-on-surface-variant")
                      }
                    >
                      {WEEKDAY_LABELS[idx]}
                    </span>
                    <span
                      className={
                        "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold " +
                        (isToday
                          ? "bg-primary-container text-on-primary-container shadow-sm"
                          : "text-on-surface")
                      }
                    >
                      {day.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* 时间网格 */}
            <div className="relative" style={{ height: totalGridH }}>
              {ALL_PERIODS.map((p) => {
                const top = (p - 1) * ROW_H;
                const dividerLabel = PERIOD_DIVIDERS[p] || null;
                const timeStr = periodTimes[String(p)] || "";
                return (
                  <div key={p}>
                    {dividerLabel && (
                      <div className="absolute left-0 right-0 flex items-center" style={{ top: top - 6 }}>
                        <span className="z-10 bg-surface-container-lowest px-1 text-[9px] font-semibold text-primary/70">
                          {dividerLabel}
                        </span>
                        <div className="h-px flex-1 bg-outline-variant/30" />
                      </div>
                    )}
                    <div
                      className="absolute left-0 flex flex-col items-center justify-center text-center"
                      style={{ top, height: ROW_H, width: LABEL_W }}
                    >
                      <span className="text-[11px] font-bold text-on-surface-variant">{p}</span>
                      {timeStr && (
                        <span className="text-[7px] leading-tight text-on-surface-variant/60">
                          {timeStr.split("-")[0]}
                        </span>
                      )}
                    </div>
                    <div
                      className="absolute border-b border-outline-variant/20"
                      style={{ left: LABEL_W, right: 0, top: top + ROW_H - 1 }}
                    />
                  </div>
                );
              })}

              {/* 日列 */}
              <div
                className="absolute grid grid-cols-7"
                style={{ left: LABEL_W, right: 0, top: 0, bottom: 0 }}
              >
                {weekInfo.days.map((day, dayIdx) => {
                  const { courses } = dayData[dayIdx];
                  const isToday = normalizeDate(day).getTime() === today.getTime();
                  return (
                    <div
                      key={dayIdx}
                      className={
                        "relative border-r border-outline-variant/15 last:border-r-0 " +
                        (isToday ? "bg-primary-container/12" : "")
                      }
                    >
                      {courses.map((cb, i) => {
                        const blockTop = (cb.firstPeriod - 1) * ROW_H + 2;
                        const blockHeight = cb.span * ROW_H - 4;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setSelected(cb.item);
                              setSelectedDate(day);
                            }}
                            className={`absolute left-1 right-1 overflow-hidden rounded-2xl border px-2 py-1.5 text-left transition active:scale-[0.97] ${cuteOf(cb.item.title)}`}
                            style={{ top: blockTop, height: blockHeight }}
                            aria-label={cb.item.title + " " + (cb.item.timeText || "")}
                          >
                            <div className="line-clamp-2 text-[11px] font-bold leading-tight">
                              {cb.item.title}
                            </div>
                            {cb.item.location && (
                              <div className="mt-0.5 truncate text-[9px] opacity-75">
                                {cb.item.location}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 特殊安排 */}
      {hasSpecials && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 px-1">
            <span className="text-[11px] font-bold text-on-surface-variant">特殊安排</span>
            <div className="h-px flex-1 bg-outline-variant/30" />
          </div>
          {weekInfo.days.map((day, dayIdx) =>
            dayData[dayIdx].specials.map((item, i) => (
              <button
                key={"sp-" + dayIdx + "-" + i}
                type="button"
                onClick={() => {
                  setSelected(item);
                  setSelectedDate(day);
                }}
                className={`flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-left transition active:scale-[0.98] ${cuteOf(item.title)}`}
              >
                <span className="w-6 text-[11px] font-semibold opacity-70">
                  周{WEEKDAY_LABELS[dayIdx]}
                </span>
                <span className="flex-1 truncate text-[12px] font-bold">{item.title}</span>
                {item.timeText && <span className="text-[11px] opacity-75">{item.timeText}</span>}
              </button>
            )),
          )}
        </div>
      )}

      <CourseDrawer item={selected} date={selectedDate} timeZone={tz} onClose={() => setSelected(null)} />
    </div>
  );
}

/* ───────────────────────── 容器 ───────────────────────── */
/**
 * 移动端萌系课表 — 高保真还原「小咪」周视图 mockup。
 * 复用既有数据逻辑(useScheduleQuery / getAdjustedItemsForDate / getNextCourse),
 * 仅移动端显示;桌面端原版 TodayView/WeekGrid/QueryView 保持不变。
 */
export function MobileSchedule() {
  const [tab, setTab] = useState<Tab>("today");
  const [mounted, setMounted] = useState(false);
  const { data, isLoading, error, refetch } = useScheduleQuery();
  const schedule = data?.schedule ?? null;
  const adjustments = data?.adjustments ?? [];

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 pb-24 pt-3 md:hidden">
      {/* 标题 */}
      <div className="px-1">
        <h1 className="text-[24px] font-bold text-primary">本周课表</h1>
        <p className="text-[13px] text-on-surface-variant">今日课程与周视图，和小咪一起规划~</p>
      </div>

      {/* 萌系分段控件 */}
      <div className="flex rounded-full bg-surface-container p-1">
        {TABS.map((t) => {
          const active = tab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={
                "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[13px] font-semibold transition " +
                (active
                  ? "bg-primary-container text-on-primary-container shadow-sm"
                  : "text-on-surface-variant")
              }
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 内容 */}
      {(!mounted || isLoading) && (
        <div className="flex flex-col gap-3">
          <div className="skeleton h-28 rounded-[28px]" />
          <div className="skeleton h-16 rounded-3xl" />
          <div className="skeleton h-16 rounded-3xl" />
        </div>
      )}

      {mounted && error && !isLoading && (
        <button
          onClick={() => refetch()}
          className="rounded-[28px] bg-surface-container-lowest px-4 py-8 text-[14px] text-on-surface-variant"
        >
          课表加载失败，点击重试
        </button>
      )}

      {mounted && !isLoading && !error && !schedule && (
        <div className="flex flex-col items-center gap-2 rounded-[28px] bg-surface-container-lowest py-10">
          <Mascot size="md" />
          <p className="text-[14px] font-medium text-on-surface">还没有课表数据</p>
          <p className="text-[12px] text-on-surface-variant">去设置里导入课表吧~</p>
        </div>
      )}

      {mounted && !isLoading && !error && schedule && (
        <>
          {tab === "today" && <TodayPane schedule={schedule} adjustments={adjustments} />}
          {tab === "week" && <WeekPane schedule={schedule} adjustments={adjustments} />}
          {tab === "query" && (
            <div className="rounded-[28px] bg-surface-container-lowest p-4 shadow-[0_12px_32px_-8px_rgba(var(--ximi-glow),0.28)]">
              <QueryView schedule={schedule} adjustments={adjustments} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default MobileSchedule;
