"use client";

import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, AlertCircle, KeyRound, MapPin, BookmarkCheck, Bell, Library, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

import {
  useLibraryData,
  useLibraryReserveStatus,
  useLibraryUserStatus,
  useCancelReserve,
  useHoldSeat,
  JWTExpiredError,
  libraryQueryKeys,
} from "@/hooks/useLibraryQuery";
import { statusColor, getReserveStatusMap } from "@/lib/theme-colors";
import type { LibraryRoom } from "@/types";

const DEFAULT_SUMMARY = { rate: 0, avail: 0, used: 0, total: 0, has: 0 };

function confirmAction(message: string): boolean {
  // eslint-disable-next-line no-alert
  return window.confirm(message);
}

export default function LibraryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [jwtStatus, setJwtStatus] = useState<"unknown" | "expired" | "refreshing" | "ok" | "error">("unknown");
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
  const {
    data: userStatus,
    error: userStatusError,
  } = useLibraryUserStatus(enabled);
  const {
    data: reserveData,
    error: reserveError,
  } = useLibraryReserveStatus(enabled);

  const cancelReserve = useCancelReserve();
  const holdSeat = useHoldSeat();

  // Hydration-safe Electron detection
  useEffect(() => {
    setIsElectron(!!window.electronAPI?.isElectron);
    setMounted(true);
  }, []);

  // Map query errors to JWT status
  useEffect(() => {
    const err = dataError || userStatusError || reserveError;
    if (!err) return;
    if (err instanceof JWTExpiredError) {
      setJwtStatus("expired");
    } else if (jwtStatus === "ok") {
      // Keep ok on transient errors if we already have data; TanStack Query will retry
    }
  }, [dataError, userStatusError, reserveError, jwtStatus]);

  // Once data arrives successfully, mark JWT as ok
  useEffect(() => {
    if (data && jwtStatus !== "ok") setJwtStatus("ok");
  }, [data, jwtStatus]);

  // Blacklist detection from user-status error
  useEffect(() => {
    if (userStatusError?.message?.includes("access_denied") ||
        userStatusError?.message?.includes("黑名单") ||
        userStatusError?.message?.includes("forbidden") ||
        userStatusError?.message?.includes("禁止")) {
      setBlacklisted(true);
    } else if (userStatus) {
      setBlacklisted(false);
    }
  }, [userStatusError, userStatus]);

  // Countdown: reserve_ttl=1800秒（30分钟）
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
    setJwtStatus("refreshing"); setRefreshError(null);
    try {
      await window.electronAPI?.libraryLogin();
      const timer = setTimeout(() => {
        setJwtStatus("expired");
      }, 5000);
      const origUnsub = window.electronAPI?.onLibraryJWTRefreshed(() => {
        clearTimeout(timer);
      });
      if (unsubTimerRef.current) clearTimeout(unsubTimerRef.current);
      if (origUnsub) unsubTimerRef.current = setTimeout(() => origUnsub(), 6000);
    } catch (e) {
      setJwtStatus("expired");
      setRefreshError(e instanceof Error ? e.message : "打开登录窗口失败");
    }
  }, [isElectron]);

  // Listen for JWT refresh events
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
    const token = reserveData?.reserve?.token;
    if (!token || cancelReserve.isPending) return;
    if (!confirmAction("确定要取消当前预约吗？")) return;
    cancelReserve.mutate(
      { sToken: token },
      {
        onSuccess: () => toast.success("预约已取消"),
        onError: (err) => {
          if (err instanceof JWTExpiredError) setJwtStatus("expired");
          toast.error(err.message || "取消失败");
        },
      }
    );
  }, [reserveData, cancelReserve]);

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

  // Loading
  if (dataLoading && !data) {
    return (
      <div className="pb-20 md:pb-0 py-16 text-center">
        <div className="text-[13px] text-muted-foreground">加载中...</div>
      </div>
    );
  }

  // JWT expired
  if (jwtStatus === "expired" || jwtStatus === "refreshing") {
    const isRefreshing = jwtStatus === "refreshing";
    return (
      <div className="pb-20 md:pb-0 max-w-md mx-auto py-16 px-4 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-red-500/10">
          <KeyRound className="w-6 h-6 text-red-500" />
        </div>
        <h1 className="text-[16px] font-bold mb-2 text-foreground">凭证已过期</h1>
        <p className="text-[12px] mb-1 text-muted-foreground">
          {isElectron ? "点击下方按钮登录智慧南工，自动同步凭证" : "请在浏览器中重新登录图书馆系统"}
        </p>
        {refreshError && <p className="text-[11px] mt-1 mb-3 text-red-500">{refreshError}</p>}
        <button
          type="button"
          onClick={handleRefreshJWT}
          className="min-h-9 px-4 py-2 rounded-xl text-[13px] font-medium inline-flex items-center gap-1.5 bg-primary text-primary-foreground cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "登录中...（如窗口已关闭请重试）" : "登录刷新"}
        </button>
        {!isElectron && (
          <p className="text-[11px] mt-3 text-muted-foreground">提示：使用 ScholarFlow 桌面版可自动刷新凭证</p>
        )}
      </div>
    );
  }

  // Error
  const queryError = dataError && !(dataError instanceof JWTExpiredError)
    ? dataError.message
    : null;
  if (queryError && !data) {
    return (
      <div className="pb-20 md:pb-0 max-w-md mx-auto py-16 px-4 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-red-500/10">
          <AlertCircle className="w-6 h-6 text-red-500" />
        </div>
        <h1 className="text-[16px] font-bold mb-2 text-foreground">加载失败</h1>
        <p className="text-[12px] mb-4 text-muted-foreground">{queryError}</p>
        <button
          type="button"
          onClick={fetchData}
          className="min-h-9 px-4 py-2 rounded-xl text-[13px] font-medium inline-flex items-center gap-1.5 bg-primary text-primary-foreground cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />重试
        </button>
      </div>
    );
  }

  // No data
  if (!data) {
    return (
      <div className="pb-20 md:pb-0 max-w-md mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Library className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-[16px] font-bold mb-2 text-foreground">图书馆座位</h1>
        <p className="text-[12px] mb-4 text-muted-foreground">需要先同步图书馆登录凭证</p>
        <button
          type="button"
          onClick={handleRefreshJWT}
          className="min-h-9 px-4 py-2 rounded-xl text-[13px] font-medium inline-flex items-center gap-1.5 bg-primary text-primary-foreground cursor-pointer"
        >
          <KeyRound className="w-3.5 h-3.5" />刷新凭证
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
  const reserveStatusMap = mounted ? getReserveStatusMap() : getReserveStatusMap();
  const c = statusColor;
  const currentReserve = reserveData?.reserve ?? null;

  return (
    <div className="max-w-5xl mx-auto pb-20 md:pb-0 py-6 animate-page">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-primary/10">
          <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.092.14-3.126.39A12.025 12.025 0 003.75 6c0 1.052.14 2.092.39 3.126A8.967 8.967 0 0012 12.042a8.967 8.967 0 006 2.25c1.052 0 2.092-.14 3.126-.39A12.025 12.025 0 0018.75 12c0-1.052-.14-2.092-.39-3.126A8.967 8.967 0 0012 6.042z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold font-display text-foreground">图书馆座位</h1>
          <p className="text-[12px] text-muted-foreground">实时座位查询与预约</p>
          {userStatus?.rank && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-medium ml-1">
              排名 #{userStatus.rank}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isElectron && (
            <button
              type="button"
              onClick={handleRefreshJWT}
              title="刷新登录凭证"
              className="min-h-9 min-w-9 px-3 py-2 rounded-xl text-[13px] font-medium inline-flex items-center justify-center gap-1 bg-card text-muted-foreground border border-border cursor-pointer"
              aria-label="刷新登录凭证"
            >
              <KeyRound className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={fetchData}
            className="min-h-9 px-4 py-2 rounded-xl text-[13px] font-medium inline-flex items-center gap-1.5 bg-card text-muted-foreground border border-border cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />刷新
          </button>
        </div>
      </div>

      {/* Data freshness */}
      {data.updated && (
        <div className="mb-4 text-[11px] flex items-center gap-1.5 text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span>上次更新：{new Date(data.updated).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })} · 自动刷新</span>
          {Date.now() - new Date(data.updated).getTime() > 5 * 60 * 1000 && (
            <span className="text-amber-500">· 数据可能已过期</span>
          )}
        </div>
      )}

      {/* Blacklist warning */}
      {blacklisted && (
        <div className="rounded-2xl p-4 mb-4 bg-red-500/5 border border-red-500/20 shadow-sm animate-fade-up">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-[13px] font-semibold text-red-500">账号受限</span>
          </div>
          <p className="text-[12px] text-muted-foreground">当前账号处于黑名单状态，无法进行预约操作。请联系图书馆管理员解除限制。</p>
        </div>
      )}

      {/* Summary */}
      <div className="rounded-2xl p-5 mb-4 bg-card border border-border shadow-sm">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold" style={{ color: c((1 - summary.rate) * 100) }}>{summary.avail}</div>
            <div className="text-xs mt-1 text-muted-foreground">可用座位</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground">{summary.used}</div>
            <div className="text-xs mt-1 text-muted-foreground">已用</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-muted-foreground">{summary.total}</div>
            <div className="text-xs mt-1 text-muted-foreground">总计</div>
          </div>
          <div className="flex-1">
            <div className="h-3 rounded-full overflow-hidden bg-secondary">
              <div className="h-full rounded-full transition-all" style={{ width: `${((1 - summary.rate) * 100).toFixed(0)}%`, backgroundColor: c((1 - summary.rate) * 100) }} />
            </div>
            <div className="text-xs mt-2 text-muted-foreground">
              空闲率 {(summary.rate * 100).toFixed(1)}% · {String(data.updated ?? "").slice(11, 19)}
            </div>
          </div>
        </div>
      </div>

      {/* Current reservation + Messages row */}
      <div className="grid gap-3 mb-6 sm:grid-cols-2">
        {/* 当前预约 */}
        <div className="rounded-xl p-4 bg-card border border-border shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <BookmarkCheck className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm text-foreground">当前预约</span>
          </div>
          {currentReserve ? (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-foreground">{currentReserve.seat_name}</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded-md font-medium" style={{
                  backgroundColor: (reserveStatusMap[currentReserve.status]?.color || "#94a3b8") + "20",
                  color: reserveStatusMap[currentReserve.status]?.color || "#94a3b8",
                }}>
                  {reserveStatusMap[currentReserve.status]?.label || `状态${currentReserve.status}`}
                </span>
              </div>
              <p className="text-[12px] text-muted-foreground mb-2">{currentReserve.lib_name} · {currentReserve.date}</p>
              {countdown && currentReserve.status === 1 && (
                <p className="text-[11px] mb-2 text-amber-500 font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {countdown}
                </p>
              )}
              <div className="flex gap-2">
                {(currentReserve.status === 1 || currentReserve.status === 2) && (
                  <button
                    type="button"
                    onClick={handleCancelReserve}
                    disabled={cancelReserve.isPending}
                    className="min-h-8 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-50 cursor-pointer"
                    aria-label="取消当前预约"
                  >
                    {cancelReserve.isPending ? "取消中..." : "取消预约"}
                  </button>
                )}
                {currentReserve.status === 2 && (
                  <button
                    type="button"
                    onClick={handleHoldSeat}
                    disabled={holdSeat.isPending}
                    className="min-h-8 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 disabled:opacity-50 cursor-pointer"
                    aria-label="暂离座位"
                  >
                    {holdSeat.isPending ? "处理中..." : "暂离"}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-[12px] text-muted-foreground">暂无预约</p>
          )}
        </div>

        {/* 消息通知入口 */}
        <button
          type="button"
          onClick={() => router.push("/library/messages")}
          className="w-full text-left rounded-xl p-4 bg-card border border-border shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
          aria-label="查看图书馆消息通知"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm text-foreground">消息通知</span>
            </div>
            <span className="text-xs text-muted-foreground">查看 →</span>
          </div>
          <p className="text-[12px] text-muted-foreground mt-2">预约提醒、违规通知等</p>
        </button>
      </div>

      {/* Room cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {openLibs.map((lib: LibraryRoom) => {
          const rt = lib.lib_rt, pct = rt.seats_total > 0 ? (rt.seats_used / rt.seats_total) * 100 : 0;
          return (
            <button
              key={lib.lib_id}
              type="button"
              onClick={() => router.push(`/library/layout?lib_id=${lib.lib_id}`)}
              className="w-full text-left rounded-xl p-4 cursor-pointer hover:opacity-80 transition-opacity bg-card border border-border shadow-sm"
              aria-label={`进入 ${lib.lib_name} 座位图`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <span className="font-medium text-sm text-foreground">{lib.lib_name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{lib.lib_floor}</span>
              </div>
              <div className="h-2 rounded-full mb-2 bg-secondary">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: c(pct) }} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span style={{ color: c(pct), fontWeight: 600 }}>{rt.seats_has} 可用</span>
                <span>{rt.seats_used}/{rt.seats_total}{rt.seats_booking > 0 ? ` · ${rt.seats_booking}预约中` : ""}</span>
                <span>{rt.open_time_str}-{rt.close_time_str}</span>
              </div>
              {rt.advance_booking && (
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  提前{rt.advance_booking}可约 · 签到限时{rt.reserve_ttl ? Math.floor(rt.reserve_ttl / 60) : 30}分钟
                </p>
              )}
            </button>
          );
        })}
      </div>
      {closedCount > 0 && (
        <p className="text-[11px] text-muted-foreground mt-3 text-center">
          另有 {closedCount} 个阅览室未开放
        </p>
      )}
    </div>
  );
}
