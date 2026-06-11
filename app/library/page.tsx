"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { RefreshCw, AlertCircle, KeyRound, MapPin, BookmarkCheck, Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { statusColor, statusColorBg, getReserveStatusMap } from "@/lib/theme-colors";
import type { LibraryData, LibraryRoom } from "@/types";

interface CurrentReserve {
  lib_id: number;
  seat_key: string;
  seat_name: string;
  lib_name: string;
  status: number;
  user_id: number;
  date: string;
  token: string;
}

const DEFAULT_SUMMARY = { rate: 0, avail: 0, used: 0, total: 0, has: 0 };

export default function LibraryPage() {
  const router = useRouter();
  const [data, setData] = useState<LibraryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jwtStatus, setJwtStatus] = useState<"unknown" | "expired" | "refreshing" | "ok" | "error">("unknown");
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isElectron, setIsElectron] = useState(false);
  const unsubTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [currentReserve, setCurrentReserve] = useState<CurrentReserve | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [holdLoading, setHoldLoading] = useState(false);
  const [countdown, setCountdown] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [userStatus, setUserStatus] = useState<{ reserve: CurrentReserve | null; rank: number | null } | null>(null);
  const [blacklisted, setBlacklisted] = useState(false);

  // Hydration-safe Electron detection
  useEffect(() => {
    setIsElectron(!!window.electronAPI?.isElectron);
    setMounted(true);
  }, []);

  const fetchData = useCallback(() => {
    setLoading(true); setError(null);
    fetch("/api/vpn-proxy")
      .then(r => {
        if (r.status === 401) {
          setJwtStatus("expired");
          throw new Error("JWT_EXPIRED");
        }
        return r.json();
      })
      .then(json => { if (json.error) throw new Error(json.error); setData(json); setJwtStatus("ok"); })
      .catch(e => {
        if (e.message !== "JWT_EXPIRED") { setError(e.message); setJwtStatus("error"); }
      })
      .finally(() => setLoading(false));
  }, []);

  const fetchUserStatus = useCallback(() => {
    fetch("/api/library/user-status")
      .then(r => {
        if (r.status === 401) return;
        return r.json();
      })
      .then(json => {
        if (!json) return;
        if (json.error) {
          // If error mentions blacklist or forbidden, mark as blacklisted
          if (json.error?.includes("黑名单") || json.error?.includes("forbidden") || json.error?.includes("禁止")) {
            setBlacklisted(true);
          }
          return;
        }
        setUserStatus(json);
        setBlacklisted(false);
      })
      .catch(() => {});
  }, []);

  const fetchReserve = useCallback(() => {
    fetch("/api/library/reserve-status")
      .then(r => r.json())
      .then(json => {
        if (json.reserve) setCurrentReserve(json.reserve);
        else setCurrentReserve(null);
      })
      .catch(() => setCurrentReserve(null));
  }, []);

  const handleCancelReserve = useCallback(async () => {
    if (!currentReserve?.token || cancelLoading) return;
    if (!confirm("确定要取消当前预约吗？")) return;
    setCancelLoading(true);
    try {
      const r = await fetch("/api/library/cancel-reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sToken: currentReserve.token }),
      });
      const json = await r.json();
      if (json.ok) {
        setCurrentReserve(null);
        fetchData();
      } else {
        alert(json.error || "取消失败");
      }
    } catch {
      alert("网络错误");
    } finally {
      setCancelLoading(false);
    }
  }, [currentReserve, cancelLoading, fetchData]);

  const handleHoldSeat = useCallback(async () => {
    if (holdLoading) return;
    setHoldLoading(true);
    try {
      const r = await fetch("/api/library/hold-seat", { method: "POST" });
      const json = await r.json();
      if (json.ok) {
        fetchReserve();
      } else {
        alert(json.error || "暂离失败");
      }
    } catch {
      alert("网络错误");
    } finally {
      setHoldLoading(false);
    }
  }, [holdLoading, fetchReserve]);

  useEffect(() => { fetchData(); fetchUserStatus(); }, [fetchData, fetchUserStatus]);

  // 自动刷新座位数据（每60秒）
  useEffect(() => {
    if (jwtStatus !== "ok") return;
    const timer = setInterval(() => { fetchData(); }, 60000);
    return () => clearInterval(timer);
  }, [jwtStatus, fetchData]);

  // 自动刷新预约状态（每30秒）
  useEffect(() => {
    if (jwtStatus !== "ok") return;
    fetchReserve();
    const timer = setInterval(() => { fetchReserve(); }, 30000);
    return () => clearInterval(timer);
  }, [jwtStatus, fetchReserve]);

  // 签到倒计时：reserve_ttl=1800秒（30分钟）
  useEffect(() => {
    if (!currentReserve || currentReserve.status !== 1) {
      setCountdown(null);
      return;
    }
    const timer = setInterval(() => {
      fetchReserve(); // 刷新预约状态
    }, 30000);
    // 简单显示"需在30分钟内签到"
    setCountdown("需在30分钟内签到");
    return () => clearInterval(timer);
  }, [currentReserve, fetchReserve]);

  // 获取座位数据成功后查当前预约（由自动刷新useEffect处理）

  const handleRefreshJWT = useCallback(async () => {
    if (!isElectron) {
      window.open("https://vpnlib.njtech.edu.cn/enlink/sso/login", "_blank");
      return;
    }
    setJwtStatus("refreshing"); setRefreshError(null);
    try {
      await window.electronAPI?.libraryLogin();
      // If no jwt-refreshed event within 5s, reset to expired
      const timer = setTimeout(() => {
        setJwtStatus("expired");
      }, 5000);
      const origUnsub = window.electronAPI?.onLibraryJWTRefreshed(() => {
        clearTimeout(timer);
      });
      // Clear previous timer before setting new one (prevent leak)
      if (unsubTimerRef.current) clearTimeout(unsubTimerRef.current);
      // Auto-cleanup listener after 6s
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
      fetchData();
    });
    const unsubExpired = window.electronAPI.onLibraryJWTExpired(() => {
      setJwtStatus("expired");
    });
    return () => {
      unsub();
      unsubExpired();
      if (unsubTimerRef.current) clearTimeout(unsubTimerRef.current);
    };
  }, [isElectron, fetchData]);

  // Loading
  if (loading) {
    return (
      <div className="pb-24 md:pb-8 py-16 text-center">
        <div className="text-[13px] text-muted-foreground">加载中...</div>
      </div>
    );
  }

  // JWT expired
  if (jwtStatus === "expired" || jwtStatus === "refreshing") {
    const isRefreshing = jwtStatus === "refreshing";
    return (
      <div className="pb-24 md:pb-8 max-w-md mx-auto py-16 px-4 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-red-500/10">
          <KeyRound className="w-6 h-6 text-red-500" />
        </div>
        <h1 className="text-[16px] font-bold mb-2 text-foreground">凭证已过期</h1>
        <p className="text-[12px] mb-1 text-muted-foreground">
          {isElectron ? "点击下方按钮登录智慧南工，自动同步凭证" : "请在浏览器中重新登录图书馆系统"}
        </p>
        {refreshError && <p className="text-[11px] mt-1 mb-3 text-red-500">{refreshError}</p>}
        <button onClick={handleRefreshJWT}
          className="px-4 py-2 rounded-xl text-[13px] font-medium inline-flex items-center gap-1.5 bg-primary text-primary-foreground">
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
  if (error) {
    return (
      <div className="pb-24 md:pb-8 max-w-md mx-auto py-16 px-4 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-red-500/10">
          <AlertCircle className="w-6 h-6 text-red-500" />
        </div>
        <h1 className="text-[16px] font-bold mb-2 text-foreground">加载失败</h1>
        <p className="text-[12px] mb-4 text-muted-foreground">{error}</p>
        <button onClick={fetchData} className="px-4 py-2 rounded-xl text-[13px] font-medium inline-flex items-center gap-1.5 bg-primary text-primary-foreground">
          <RefreshCw className="w-3.5 h-3.5" />重试
        </button>
      </div>
    );
  }

  // No data
  if (!data) {
    return (
      <div className="pb-24 md:pb-8 max-w-md mx-auto py-16 px-4 text-center">
        <div className="text-5xl mb-4">📚</div>
        <h1 className="text-[16px] font-bold mb-2 text-foreground">图书馆座位</h1>
        <p className="text-[12px] mb-4 text-muted-foreground">需要先同步图书馆登录凭证</p>
        <button onClick={handleRefreshJWT} className="px-4 py-2 rounded-xl text-[13px] font-medium inline-flex items-center gap-1.5 bg-primary text-primary-foreground">
          <KeyRound className="w-3.5 h-3.5" />刷新凭证
        </button>
      </div>
    );
  }

  if (!data?.libs?.length) {
    return (
      <div className="pb-24 md:pb-8 py-8 text-center">
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

  return (
    <div className="max-w-5xl mx-auto pb-24 md:pb-8 py-6 animate-page">
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
            <button onClick={handleRefreshJWT} title="刷新登录凭证"
              className="px-3 py-2 rounded-xl text-[13px] font-medium inline-flex items-center gap-1 bg-card text-muted-foreground border border-border dark:border-transparent">
              <KeyRound className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={fetchData} className="px-4 py-2 rounded-xl text-[13px] font-medium inline-flex items-center gap-1.5 bg-card text-muted-foreground border border-border dark:border-transparent">
            <RefreshCw className="w-3.5 h-3.5" />刷新
          </button>
        </div>
      </div>

      {/* Data freshness */}
      {data.updated && (
        <div className="mb-4 text-[11px] flex items-center gap-1.5 text-muted-foreground">
          <span>⏱ 上次更新：{new Date(data.updated).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })} · 自动刷新</span>
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
      <div className="rounded-2xl p-5 mb-4 bg-card border border-border dark:border-transparent shadow-sm">
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
        <div className="rounded-xl p-4 bg-card border border-border dark:border-transparent shadow-sm">
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
                <p className="text-[11px] mb-2 text-amber-500 font-medium">⏱ {countdown}</p>
              )}
              <div className="flex gap-2">
                {(currentReserve.status === 1 || currentReserve.status === 2) && (
                  <button onClick={handleCancelReserve} disabled={cancelLoading}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-50">
                    {cancelLoading ? "取消中..." : "取消预约"}
                  </button>
                )}
                {currentReserve.status === 2 && (
                  <button onClick={handleHoldSeat} disabled={holdLoading}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 disabled:opacity-50">
                    {holdLoading ? "处理中..." : "暂离"}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-[12px] text-muted-foreground">暂无预约</p>
          )}
        </div>

        {/* 消息通知入口 */}
        <div onClick={() => router.push("/library/messages")}
          className="rounded-xl p-4 bg-card border border-border dark:border-transparent shadow-sm cursor-pointer hover:opacity-80 transition-opacity">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm text-foreground">消息通知</span>
            </div>
            <span className="text-xs text-muted-foreground">查看 →</span>
          </div>
          <p className="text-[12px] text-muted-foreground mt-2">预约提醒、违规通知等</p>
        </div>
      </div>

      {/* Room cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {openLibs.map((lib: LibraryRoom) => {
          const rt = lib.lib_rt, pct = rt.seats_total > 0 ? (rt.seats_used / rt.seats_total) * 100 : 0;
          return (
            <div key={lib.lib_id} onClick={() => router.push(`/library/layout?lib_id=${lib.lib_id}`)}
              className="rounded-xl p-4 cursor-pointer hover:opacity-80 transition-opacity bg-card border border-border dark:border-transparent shadow-sm">
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
            </div>
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
