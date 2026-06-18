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

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
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
import { statusColor, getReserveStatusMap } from "@/lib/theme-colors";
import { cn } from "@/lib/utils";
import type { LibraryRoom } from "@/types";

const DEFAULT_SUMMARY = { rate: 0, avail: 0, used: 0, total: 0, has: 0 };

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
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

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

  const handleCancelReserve = useCallback(() => {
    if (cancelReserve.isPending) return;
    setCancelDialogOpen(true);
  }, [cancelReserve]);

  const doCancelReserve = useCallback(() => {
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

  const pageActions = (
    <div className="flex items-center gap-2 shrink-0">
      {isElectron && (
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefreshJWT}
          title="刷新登录凭证"
          aria-label="刷新登录凭证"
          disabled={dataLoading && !data}
        >
          <KeyRound className="w-3.5 h-3.5" />
        </Button>
      )}
      <Button variant="outline" onClick={fetchData} disabled={dataLoading && !data}>
        <RefreshCw className="w-3.5 h-3.5" />
        刷新
      </Button>
    </div>
  );

  if (dataLoading && !data) {
    return (
      <div className="max-w-5xl mx-auto pb-20 md:pb-0 py-6 px-4 sm:px-6 animate-page">
        <PageHeader
          icon={<Library className="w-5 h-5 text-primary" />}
          title="图书馆座位"
          description="实时座位查询与预约"
          actions={pageActions}
        />
        <div className="py-16 text-center">
          <LoadingSpinner label="加载座位数据..." />
        </div>
      </div>
    );
  }

  if (jwtStatus === "expired" || jwtStatus === "refreshing") {
    const isRefreshing = jwtStatus === "refreshing";
    return (
      <div className="max-w-5xl mx-auto pb-20 md:pb-0 py-6 px-4 sm:px-6 animate-page">
        <PageHeader
          icon={<Library className="w-5 h-5 text-primary" />}
          title="图书馆座位"
          description="实时座位查询与预约"
          actions={pageActions}
        />
        <div className="max-w-md mx-auto py-16 px-4 text-center">
          <EmptyState
            icon={KeyRound}
            title="凭证已过期"
            description={
              isElectron
                ? "点击下方按钮登录智慧南工，自动同步凭证"
                : "请在浏览器中重新登录图书馆系统"
            }
          />
          {refreshError && (
            <p className="text-[11px] mt-3 text-destructive">{refreshError}</p>
          )}
          <Button
            className="mt-4"
            onClick={handleRefreshJWT}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {isRefreshing ? "登录中..." : "登录刷新"}
          </Button>
          {!isElectron && (
            <p className="text-[11px] mt-3 text-muted-foreground">
              提示：使用 ScholarFlow 桌面版可自动刷新凭证
            </p>
          )}
        </div>
      </div>
    );
  }

  const queryError =
    dataError && !(dataError instanceof JWTExpiredError)
      ? dataError.message
      : null;
  if (queryError && !data) {
    return (
      <div className="max-w-5xl mx-auto pb-20 md:pb-0 py-6 px-4 sm:px-6 animate-page">
        <PageHeader
          icon={<Library className="w-5 h-5 text-primary" />}
          title="图书馆座位"
          description="实时座位查询与预约"
          actions={pageActions}
        />
        <div className="max-w-md mx-auto py-16 px-4 text-center">
          <EmptyState icon={AlertCircle} title="加载失败" description={queryError} />
          <Button className="mt-4" onClick={fetchData}>
            <RefreshCw className="w-3.5 h-3.5" />
            重试
          </Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-5xl mx-auto pb-20 md:pb-0 py-6 px-4 sm:px-6 animate-page">
        <PageHeader
          icon={<Library className="w-5 h-5 text-primary" />}
          title="图书馆座位"
          description="实时座位查询与预约"
          actions={pageActions}
        />
        <div className="max-w-md mx-auto py-16 px-4 text-center">
          <EmptyState
            icon={Library}
            title="图书馆座位"
            description="需要先同步图书馆登录凭证"
          />
          <Button className="mt-4" onClick={handleRefreshJWT}>
            <KeyRound className="w-3.5 h-3.5" />
            刷新凭证
          </Button>
        </div>
      </div>
    );
  }

  if (!data?.libs?.length) {
    return (
      <div className="max-w-5xl mx-auto pb-20 md:pb-0 py-6 px-4 sm:px-6 animate-page">
        <PageHeader
          icon={<Library className="w-5 h-5 text-primary" />}
          title="图书馆座位"
          description="实时座位查询与预约"
          actions={pageActions}
        />
        <div className="max-w-md mx-auto py-16 px-4 text-center">
          <EmptyState
            icon={MapPin}
            title="暂无可预约阅览室"
            description="当前没有开放的阅览室"
          />
          <Button className="mt-4" onClick={fetchData}>
            <RefreshCw className="w-3.5 h-3.5" />
            刷新
          </Button>
        </div>
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
      <PageHeader
        icon={<Library className="w-5 h-5 text-primary" />}
        title="图书馆座位"
        description="实时座位查询与预约"
        actions={
          <div className="flex items-center gap-2 shrink-0">
            {isElectron && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefreshJWT}
                title="刷新登录凭证"
                aria-label="刷新登录凭证"
              >
                <KeyRound className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className="w-3.5 h-3.5" />
              刷新
            </Button>
          </div>
        }
      />

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
        <Card className="p-4 mb-4 border-destructive/20 bg-destructive/5 animate-fade-up">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <span className="text-[13px] font-semibold text-destructive">
              账号受限
            </span>
          </div>
          <p className="text-[12px] text-muted-foreground">
            当前账号处于黑名单状态，无法进行预约操作。请联系图书馆管理员解除限制。
          </p>
        </Card>
      )}

      {/* Summary */}
      <Card className="p-4 sm:p-5 mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <StatCard value={summary.avail} label="可用座位" color={c(freePct)} />
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
      </Card>

      {/* Current reservation */}
      <Card
        className={cn(
          "mb-5 overflow-hidden relative transition-all",
          currentReserve
            ? "p-4 pl-5 sm:p-5 sm:pl-6 bg-gradient-to-br from-primary/[0.07] to-card border-primary/20"
            : "p-2.5 pl-4 sm:p-3 sm:pl-5 border-border",
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
              {(() => {
                const statusInfo = reserveStatusMap[currentReserve.status];
                const color = statusInfo?.color || "#94a3b8";
                return (
                  <Badge
                    variant="outline"
                    className="text-[11px] border"
                    style={{
                      backgroundColor: `${color}15`,
                      color,
                      borderColor: `${color}30`,
                    }}
                  >
                    {statusInfo?.label || `状态${currentReserve.status}`}
                  </Badge>
                );
              })()}
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
                  <Badge
                    variant="outline"
                    className="mt-3 text-[11px] border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  >
                    <Clock className="w-3 h-3 mr-1" /> {countdown}
                  </Badge>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                {(currentReserve.status === 1 ||
                  currentReserve.status === 2) && (
                  <Button
                    variant="destructive"
                    onClick={handleCancelReserve}
                    disabled={cancelReserve.isPending}
                    aria-label="取消当前预约"
                  >
                    <X className="w-3.5 h-3.5" />
                    {cancelReserve.isPending ? "取消中..." : "取消"}
                  </Button>
                )}
                {currentReserve.status === 2 && (
                  <Button
                    variant="outline"
                    onClick={handleHoldSeat}
                    disabled={holdSeat.isPending}
                    className="text-amber-600 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 hover:text-amber-600"
                    aria-label="暂离座位"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    {holdSeat.isPending ? "处理中..." : "暂离"}
                  </Button>
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
            <Button
              variant="default"
              onClick={() =>
                document
                  .getElementById("rooms-section")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              去预约
            </Button>
          </div>
        )}
      </Card>

      {/* Messages shortcut */}
      <Card
        className="p-4 mb-4 cursor-pointer hover:bg-accent/50"
        onClick={() => router.push("/library/messages")}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            router.push("/library/messages");
          }
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 text-primary" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-foreground">
                  消息通知
                </span>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-[11px]">
                    {unreadCount} 条未读
                  </Badge>
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
          <Button variant="ghost" className="text-xs shrink-0 ml-2">
            查看
          </Button>
        </div>
      </Card>

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
            <Card
              key={lib.lib_id}
              className="p-4 cursor-pointer"
              onClick={() =>
                router.push(`/library/layout?lib_id=${lib.lib_id}`)
              }
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  router.push(`/library/layout?lib_id=${lib.lib_id}`);
                }
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-semibold text-sm text-foreground">
                    {lib.lib_name}
                  </span>
                </div>
                <Badge variant="secondary" className="text-[11px]">
                  {lib.lib_floor}
                </Badge>
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
            </Card>
          );
        })}
      </div>

      {closedCount > 0 && (
        <p className="text-[11px] text-muted-foreground mt-4 text-center">
          另有 {closedCount} 个阅览室未开放
        </p>
      )}

      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title="确定要取消当前预约吗？"
        onConfirm={doCancelReserve}
      />
    </div>
  );
}
