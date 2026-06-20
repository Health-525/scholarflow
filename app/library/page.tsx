"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  RefreshCw,
  AlertCircle,
  KeyRound,
  MapPin,
  Library,
  Clock,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton, Skeleton } from "@/components/ui/skeleton";
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
import { getReserveStatusMap } from "@/lib/theme-colors";
import type { LibraryRoom } from "@/types";

import {
  LibraryHeader,
  LibraryRoomCard,
  LibrarySummaryCard,
  MessagesCard,
  ReservationCard,
  UserStatusCard,
} from "./components";
import { DEFAULT_SUMMARY } from "./utils";

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
      <Button
        variant="outline"
        onClick={fetchData}
        disabled={dataLoading && !data}
      >
        <RefreshCw className="w-3.5 h-3.5" />
        刷新
      </Button>
    </div>
  );

  if (dataLoading && !data) {
    return (
      <div className="max-w-5xl mx-auto pb-20 md:pb-0 py-6 px-4 sm:px-6 animate-page">
        <LibraryHeader actions={pageActions} />
        <Card className="p-4 sm:p-5 mb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="text-center px-3">
                  <Skeleton className="h-8 w-12 mx-auto" />
                  <Skeleton className="h-2 w-10 mx-auto mt-1.5" />
                </div>
              ))}
            </div>
            <div className="hidden sm:block text-right">
              <Skeleton className="h-8 w-14 ml-auto" />
              <Skeleton className="h-2 w-10 ml-auto mt-1.5" />
            </div>
          </div>
          <Skeleton className="h-2.5 w-full rounded-full mt-4" />
          <div className="flex justify-between mt-2">
            <Skeleton className="h-2 w-24" />
            <Skeleton className="h-2 w-24" />
          </div>
        </Card>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (jwtStatus === "expired" || jwtStatus === "refreshing") {
    const isRefreshing = jwtStatus === "refreshing";
    return (
      <div className="max-w-5xl mx-auto pb-20 md:pb-0 py-6 px-4 sm:px-6 animate-page">
        <LibraryHeader actions={pageActions} />
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
        <LibraryHeader actions={pageActions} />
        <div className="max-w-md mx-auto py-16 px-4 text-center">
          <EmptyState
            icon={AlertCircle}
            title="加载失败"
            description={queryError}
          />
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
        <LibraryHeader actions={pageActions} />
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
        <LibraryHeader actions={pageActions} />
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
  const currentReserve = reserveData?.reserve ?? null;
  const messages = messagesData?.messages ?? [];
  const unreadCount = messages.filter((m) => m.isread === 0).length;
  const latestMessage = messages[0];

  return (
    <div className="max-w-5xl mx-auto pb-20 md:pb-0 py-6 px-4 sm:px-6 animate-page">
      <LibraryHeader actions={pageActions} />

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

      <UserStatusCard blacklisted={blacklisted} />

      <LibrarySummaryCard
        summary={summary}
        openLibsLength={openLibs.length}
        dataUpdated={data.updated}
      />

      <ReservationCard
        currentReserve={currentReserve}
        countdown={countdown}
        reserveStatusMap={reserveStatusMap}
        onCancelReserve={handleCancelReserve}
        onHoldSeat={handleHoldSeat}
        cancelPending={cancelReserve.isPending}
        holdPending={holdSeat.isPending}
        onReserve={() =>
          document
            .getElementById("rooms-section")
            ?.scrollIntoView({ behavior: "smooth" })
        }
      />

      <MessagesCard
        unreadCount={unreadCount}
        latestMessage={latestMessage}
        onClick={() => router.push("/library/messages")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            router.push("/library/messages");
          }
        }}
      />

      {/* Room cards */}
      <div
        id="rooms-section"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {openLibs.map((lib: LibraryRoom) => (
          <LibraryRoomCard
            key={lib.lib_id}
            lib={lib}
            onClick={() => router.push(`/library/layout?lib_id=${lib.lib_id}`)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                router.push(`/library/layout?lib_id=${lib.lib_id}`);
              }
            }}
          />
        ))}
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
