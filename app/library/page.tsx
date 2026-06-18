"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  RefreshCw,
  AlertCircle,
  KeyRound,
  MapPin,
  BookmarkCheck,
  Bell,
  Library,
  Clock,
  Armchair,
  CalendarDays,
  MapPinned,
  X,
  LogOut,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

import {
  useLibraryData,
  useLibraryReserveStatus,
  useLibraryUserStatus,
  useLibraryMessages,
  useCancelReserve,
  useHoldSeat,
  JWTExpiredError,
  libraryQueryKeys,
} from "@/hooks/useLibraryQuery";
import { cardClasses } from "@/components/ui/card";
import { statusColor, getReserveStatusMap } from "@/lib/theme-colors";
import { cn } from "@/lib/utils";
import type { LibraryRoom } from "@/types";

const DEFAULT_SUMMARY = { rate: 0, avail: 0, used: 0, total: 0, has: 0 };

function confirmAction(message: string): boolean {
  // eslint-disable-next-line no-alert
  return window.confirm(message);
}

function formatReserveDate(date: string | number | undefined): string {
  if (!date) return "";
  const ts = typeof date === "number" ? date * 1000 : Date.parse(date);
  if (Number.isNaN(ts)) return String(date);
  return new Date(ts).toLocaleString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatCard({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color?: string;
}) {
  return (
    <div className="text-center px-3">
      <div
        className="text-2xl sm:text-3xl font-bold tabular-nums"
        style={{ color }}
      >
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

export default function LibraryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [jwtStatus, setJwtStatus] = useState<
    "unknown" | "expired" | "refreshing" | "ok" | "error"
  >("unknown");
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isElectron, setIsElectron] = useState(false);
  const unsubTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [countdown, setCountdown] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [blacklisted, setBlacklisted] = useState(false);

  const enabled = jwtStatus === "ok" || jwtStatus === "unknown";
  const {
    data,
    isLoading: dataLoading,
    error: dataError,
  } = useLibraryData(enabled);
  const { data: userStatus, error: userStatusError } =
    useLibraryUserStatus(enabled);
  const { data: reserveData, error: reserveError } =
    useLibraryReserveStatus(enabled);
  const { data: messagesData } = useLibraryMessages(1, enabled);

  const cancelReserve = useCancelReserve();
  const holdSeat = useHoldSeat();

  useEffect(() => {
    setIsElectron(!!window.electronAPI?.isElectron);
    setMounted(true);
  }, []);

  useEffect(() => {
    const err = dataError || userStatusError || reserveError;
    if (!err) return;
    if (err instanceof JWTExpiredError) {
      setJwtStatus("expired");
    }
  }, [dataError, userStatusError, reserveError, jwtStatus]);

  useEffect(() => {
    if (data && jwtStatus !== "ok") setJwtStatus("ok");
  }, [data, jwtStatus]);

  useEffect(() => {
    if (
      userStatusError?.message?.includes("access_denied") ||
      userStatusError?.message?.includes("黑名单") ||
      userStatusError?.message?.includes("forbidden") ||
      userStatusError?.message?.includes("禁止")
    ) {
      setBlacklisted(true);
    } else if (userStatus) {
      setBlacklisted(false);
    }
  }, [userStatusError, userStatus]);

  useEffect(() => {
    const reserve = reserveData?.reserve;
    if (!reserve || reserve.status !== 1) {
      setCountdown(null);
      return;
    }
    setCountdown("需在30分钟内签到");
  }, [reserveData]);

  const handleRefreshJWT = useCallback(async () => {
    if (!isElectron) {
      window.open("https://vpnlib.njtech.edu.cn/enlink/sso/login", "_blank");
      return;
    }
    setJwtStatus("refreshing");
    setRefreshError(null);
    try {
      await window.electronAPI?.libraryLogin();
      const timer = setTimeout(() => {
        setJwtStatus("expired");
      }, 5000);
      const origUnsub = window.electronAPI?.onLibraryJWTRefreshed(() => {
        clearTimeout(timer);
      });
      if (unsubTimerRef.current) clearTimeout(unsubTimerRef.current);
      if (origUnsub)
        unsubTimerRef.current = setTimeout(() => origUnsub(), 6000);
    } catch (e) {
      setJwtStatus("expired");
      setRefreshError(e instanceof Error ? e.message : "打开登录窗口失败");
    }
  }, [isElectron]);

  useEffect(() => {
    if (!isElectron || !window.electronAPI) return;
    const unsub = window.electronAPI.onLibraryJWTRefreshed(() => {
      setJwtStatus("ok");
      queryClient.invalidateQueries({ queryKey: libraryQueryKeys.all });
    });
    const unsubExpired = window.electronAPI.onLibraryJWTExpired(() => {
      setJwtStatus("expired");
    });
    return () => {
      unsub();
      unsubExpired();
      if (unsubTimerRef.current) clearTimeout(unsubTimerRef.current);
    };
  }, [isElectron, queryClient]);

  const handleCancelReserve = useCallback(async () => {
    if (cancelReserve.isPending) return;
    if (!confirmAction("确定要取消当前预约吗？")) return;
    cancelReserve.mutate(
      {},
      {
        onSuccess: () => toast.success("预约已取消"),
        onError: (err) => {
          if (err instanceof JWTExpiredError) setJwtStatus("expired");
          toast.error(err.message || "取消失败");
        },
      },
    );
  }, [cancelReserve]);

  const handleHoldSeat = useCallback(async () => {
    if (holdSeat.isPending) return;
    holdSeat.mutate(undefined, {
      onSuccess: () => toast.success("已暂离"),
      onError: (err) => {
        if (err instanceof JWTExpiredError) setJwtStatus("expired");
        toast.error(err.message || "暂离失败");
      },
    });
  }, [holdSeat]);

  const fetchData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: libraryQueryKeys.all });
  }, [queryClient]);

  if (dataLoading && !data) {
    return (
      <div className="pb-20 md:pb-0 py-16 text-center">
        <div className="inline-flex items-center gap-2 text-[13px] text-muted-foreground">
          <RefreshCw className="w-4 h-4 animate-spin" /> 加载中...
        </div>
      </div>
    );
  }

  if (jwtStatus === "expired" || jwtStatus === "refreshing") {
    const isRefreshing = jwtStatus === "refreshing";
    return (
      <div className="pb-20 md:pb-0 max-w-md mx-auto py-16 px-4 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-destructive/10">
          <KeyRound className="w-6 h-6 text-destructive" />
        </div>
        <h1 className="text-[16px] font-bold mb-2 text-foreground">
          凭证已过期
        </h1>
        <p className="text-[12px] mb-1 text-muted-foreground">
          {isElectron
            ? "点击下方按钮登录智慧南工，自动同步凭证"
            : "请在浏览器中重新登录图书馆系统"}
        </p>
        {refreshError && (
          <p className="text-[11px] mt-1 mb-3 text-destructive">{refreshError}</p>
        )}
        <button
          type="button"
          onClick={handleRefreshJWT}
          className="min-h-9 px-4 py-2 rounded-xl text-[13px] font-medium inline-flex items-center gap-1.5 bg-primary text-primary-foreground cursor-pointer"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
          />
          {isRefreshing ? "登录中..." : "登录刷新"}
        </button>
        {!isElectron && (
          <p className="text-[11px] mt-3 text-muted-foreground">
            提示：使用 ScholarFlow 桌面版可自动刷新凭证
          </p>
        )}
      </div>
    );
  }

  const queryError =
    dataError && !(dataError instanceof JWTExpiredError)
      ? dataError.message
      : null;
  if (queryError && !data) {
    return (
      <div className="pb-20 md:pb-0 max-w-md mx-auto py-16 px-4 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-destructive/10">
          <AlertCircle className="w-6 h-6 text-destructive" />
        </div>
        <h1 className="text-[16px] font-bold mb-2 text-foreground">加载失败</h1>
        <p className="text-[12px] mb-4 text-muted-foreground">{queryError}</p>
        <button
          type="button"
          onClick={fetchData}
          className="min-h-9 px-4 py-2 rounded-xl text-[13px] font-medium inline-flex items-center gap-1.5 bg-primary text-primary-foreground cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          重试
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="pb-20 md:pb-0 max-w-md mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Library className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-[16px] font-bold mb-2 text-foreground">
          图书馆座位
        </h1>
        <p className="text-[12px] mb-4 text-muted-foreground">
          需要先同步图书馆登录凭证
        </p>
        <button
          type="button"
          onClick={handleRefreshJWT}
          className="min-h-9 px-4 py-2 rounded-xl text-[13px] font-medium inline-flex items-center gap-1.5 bg-primary text-primary-foreground cursor-pointer"
        >
          <KeyRound className="w-3.5 h-3.5" />
          刷新凭证
        </button>
      </div>
    );
  }

  if (!data?.libs?.length) {
    return (
      <div className="pb-20 md:pb-0 py-8 text-center">
        <p className="text-[13px] text-muted-foreground">暂无数据</p>
      </div>
    );
  }

  const summary = data.summary ?? DEFAULT_SUMMARY;
  const { libs } = data;
  const openLibs = libs.filter((l: LibraryRoom) => l.is_open);
  const closedCount = libs.length - openLibs.length;
  const reserveStatusMap = mounted
    ? getReserveStatusMap()
    : getReserveStatusMap();
  const c = statusColor;
  const currentReserve = reserveData?.reserve ?? null;
  const freePct = summary.total > 0 ? (summary.avail / summary.total) * 100 : 0;
  const messages = messagesData?.messages ?? [];
  const unreadCount = messages.filter((m) => m.isread === 0).length;
  const latestMessage = messages[0];

  return (
    <div className="max-w-5xl mx-auto pb-20 md:pb-0 py-6 px-4 sm:px-6 animate-page">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
            <Library className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold font-display text-foreground">
              图书馆座位
            </h1>
            <p className="text-[12px] text-muted-foreground">
              实时座位查询与预约
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isElectron && (
            <button
              type="button"
              onClick={handleRefreshJWT}
              title="刷新登录凭证"
              className="min-h-9 min-w-9 px-3 py-2 rounded-xl text-[13px] font-medium inline-flex items-center justify-center gap-1 bg-card text-muted-foreground border border-border cursor-pointer hover:bg-accent transition-colors"
              aria-label="刷新登录凭证"
            >
              <KeyRound className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={fetchData}
            className="min-h-9 px-3 py-2 rounded-xl text-[13px] font-medium inline-flex items-center gap-1.5 bg-card text-muted-foreground border border-border cursor-pointer hover:bg-accent transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            刷新
          </button>
        </div>
      </div>

      {/* Data freshness */}
      {data.updated && (
        <div className="mb-4 text-[11px] flex items-center gap-1.5 text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span>
            上次更新：
            {new Date(data.updated).toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            · 自动刷新
          </span>
          {Date.now() - new Date(data.updated).getTime() > 5 * 60 * 1000 && (
            <span className="text-[var(--status-warning)]">· 数据可能已过期</span>
          )}
        </div>
      )}

      {/* Blacklist warning */}
      {blacklisted && (
        <div className="rounded-2xl p-4 mb-4 bg-destructive/5 border border-destructive/20 shadow-sm animate-fade-up">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <span className="text-[13px] font-semibold text-destructive">
              账号受限
            </span>
          </div>
          <p className="text-[12px] text-muted-foreground">
            当前账号处于黑名单状态，无法进行预约操作。请联系图书馆管理员解除限制。
          </p>
        </div>
      )}

      {/* Summary */}
      <div className={cn(cardClasses, "p-4 sm:p-5 mb-5")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <StatCard
              value={summary.avail}
              label="可用座位"
              color={c(freePct)}
            />
            <div className="w-px h-10 bg-border" />
            <StatCard value={summary.used} label="已使用" />
            <div className="w-px h-10 bg-border" />
            <StatCard value={summary.total} label="总座位" />
          </div>
          <div className="hidden sm:block text-right">
            <div
              className="text-2xl font-bold tabular-nums"
              style={{ color: c(freePct) }}
            >
              {freePct.toFixed(0)}%
            </div>
            <div className="text-[11px] text-muted-foreground">空闲率</div>
          </div>
        </div>
        <div className="mt-4">
          <div className="h-2.5 rounded-full overflow-hidden bg-secondary">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${freePct}%`, backgroundColor: c(freePct) }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground mt-2">
            <span>{openLibs.length} 个阅览室开放</span>
            <span>更新时间 {String(data.updated ?? "").slice(11, 19)}</span>
          </div>
        </div>
      </div>

      {/* Current reservation */}
      <div
        className={cn(
          "rounded-2xl mb-5 border shadow-sm overflow-hidden relative transition-all",
          currentReserve
            ? "p-4 pl-5 sm:p-5 sm:pl-6 bg-gradient-to-br from-primary/[0.07] to-card border-primary/20"
            : "p-2.5 pl-4 sm:p-3 sm:pl-5 bg-card border-border",
        )}
      >
        {currentReserve && (
          <div
            className="absolute top-0 left-0 w-1 h-full"
            style={{
              backgroundColor:
                reserveStatusMap[currentReserve.status]?.color || "#94a3b8",
            }}
          />
        )}

        {currentReserve ? (
          <>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-primary/10">
                  <BookmarkCheck className="w-4 h-4 text-primary" />
                </div>
                <span className="font-semibold text-sm text-foreground">
                  当前预约
                </span>
              </div>
              <span
                className="text-[11px] px-2.5 py-1 rounded-full font-medium border"
                style={{
                  backgroundColor:
                    (reserveStatusMap[currentReserve.status]?.color ||
                      "#94a3b8") + "15",
                  color:
                    reserveStatusMap[currentReserve.status]?.color || "#94a3b8",
                  borderColor:
                    (reserveStatusMap[currentReserve.status]?.color ||
                      "#94a3b8") + "30",
                }}
              >
                {reserveStatusMap[currentReserve.status]?.label ||
                  `状态${currentReserve.status}`}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Armchair className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-xl sm:text-2xl font-bold text-foreground tracking-tight truncate">
                    {currentReserve.seat_name || "未知座位"}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                    <MapPinned className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      {currentReserve.lib_name || "未知阅览室"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                    <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                    <span>{formatReserveDate(currentReserve.date)}</span>
                  </div>
                </div>
                {countdown && currentReserve.status === 1 && (
                  <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <Clock className="w-3 h-3" /> {countdown}
                  </div>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                {(currentReserve.status === 1 ||
                  currentReserve.status === 2) && (
                  <button
                    type="button"
                    onClick={handleCancelReserve}
                    disabled={cancelReserve.isPending}
                    className="min-h-9 px-3 py-2 rounded-xl text-[12px] font-medium inline-flex items-center gap-1.5 bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:opacity-50 cursor-pointer transition-colors"
                    aria-label="取消当前预约"
                  >
                    <X className="w-3.5 h-3.5" />
                    {cancelReserve.isPending ? "取消中..." : "取消"}
                  </button>
                )}
                {currentReserve.status === 2 && (
                  <button
                    type="button"
                    onClick={handleHoldSeat}
                    disabled={holdSeat.isPending}
                    className="min-h-9 px-3 py-2 rounded-xl text-[12px] font-medium inline-flex items-center gap-1.5 bg-[var(--status-warning)]/10 text-[var(--status-warning)] hover:bg-[var(--status-warning)]/20 disabled:opacity-50 cursor-pointer transition-colors"
                    aria-label="暂离座位"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    {holdSeat.isPending ? "处理中..." : "暂离"}
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-secondary">
                <BookmarkCheck className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-[13px] text-foreground font-medium">
                当前暂无预约
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("rooms-section")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="text-[11px] px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors shrink-0"
            >
              去预约
            </button>
          </div>
        )}
      </div>

      {/* Messages shortcut */}
      <button
        type="button"
        onClick={() => router.push("/library/messages")}
        className="w-full text-left rounded-2xl p-4 mb-4 bg-card border border-border shadow-sm cursor-pointer hover:bg-accent/50 transition-colors"
        aria-label="查看图书馆消息通知"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 text-primary" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-foreground">
                  消息通知
                </span>
                {unreadCount > 0 && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">
                    {unreadCount} 条未读
                  </span>
                )}
              </div>
              {latestMessage ? (
                <p className="text-[12px] text-muted-foreground truncate">
                  最新：{latestMessage.title}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  预约提醒、违规通知、系统公告
                </p>
              )}
            </div>
          </div>
          <span className="text-xs text-muted-foreground shrink-0 ml-2">
            查看 →
          </span>
        </div>
      </button>

      {/* Room cards */}
      <div
        id="rooms-section"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {openLibs.map((lib: LibraryRoom) => {
          const rt = lib.lib_rt;
          const pct =
            rt.seats_total > 0 ? (rt.seats_used / rt.seats_total) * 100 : 0;
          const color = c(pct);
          return (
            <button
              key={lib.lib_id}
              type="button"
              onClick={() =>
                router.push(`/library/layout?lib_id=${lib.lib_id}`)
              }
              className="w-full text-left rounded-2xl p-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all bg-card border border-border shadow-sm"
              aria-label={`进入 ${lib.lib_name} 座位图`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-semibold text-sm text-foreground">
                    {lib.lib_name}
                  </span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                  {lib.lib_floor}
                </span>
              </div>
              <div className="h-2 rounded-full mb-3 bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold" style={{ color }}>
                  {rt.seats_has} 可用
                </span>
                <span className="text-muted-foreground">
                  {rt.seats_used}/{rt.seats_total}
                  {rt.seats_booking > 0 ? ` · ${rt.seats_booking} 预约中` : ""}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2">
                <span>
                  {rt.open_time_str} - {rt.close_time_str}
                </span>
                {rt.advance_booking && (
                  <span>提前 {rt.advance_booking} 可约</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {closedCount > 0 && (
        <p className="text-[11px] text-muted-foreground mt-4 text-center">
          另有 {closedCount} 个阅览室未开放
        </p>
      )}
    </div>
  );
}
