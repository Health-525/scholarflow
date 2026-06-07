"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, AlertCircle, KeyRound, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import type { LibraryData, LibraryRoom } from "@/types";

export default function LibraryPage() {
  const router = useRouter();
  const [data, setData] = useState<LibraryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jwtStatus, setJwtStatus] = useState<"unknown" | "expired" | "refreshing" | "ok" | "error">("unknown");
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const isElectron = typeof window !== "undefined" && window.electronAPI?.isElectron;

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

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRefreshJWT = useCallback(async () => {
    if (!isElectron) {
      window.open("https://vpnlib.njtech.edu.cn/enlink/sso/login", "_blank");
      return;
    }
    setJwtStatus("refreshing"); setRefreshError(null);
    try {
      await window.electronAPI!.libraryLogin();
      // 登录窗口关闭后，如果5秒内没收到 jwt-refreshed 事件，说明用户关了窗口没登录成功
      // 重置为 expired 让用户可以再次点击
      const timer = setTimeout(() => {
        setJwtStatus("expired");
      }, 5000);
      // 如果 jwt-refreshed 事件先到达，清除定时器
      const origUnsub = window.electronAPI!.onLibraryJWTRefreshed(() => {
        clearTimeout(timer);
      });
      // 5秒后自动清理监听
      setTimeout(() => origUnsub(), 6000);
    } catch (e) {
      setJwtStatus("expired");
      setRefreshError(e instanceof Error ? e.message : "打开登录窗口失败");
    }
  }, [isElectron]);

  // 监听 JWT 刷新成功事件（登录窗口关闭后触发）
  useEffect(() => {
    if (!isElectron || !window.electronAPI) return;
    const unsub = window.electronAPI.onLibraryJWTRefreshed(() => {
      setJwtStatus("ok");
      fetchData();
    });
    const unsubExpired = window.electronAPI.onLibraryJWTExpired(() => {
      setJwtStatus("expired");
    });
    return () => { unsub(); unsubExpired(); };
  }, [isElectron, fetchData]);

  // 加载中
  if (loading) {
    return (
      <div className="pb-24 md:pb-8 max-w-5xl mx-auto py-16 text-center">
        <div className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>加载中...</div>
      </div>
    );
  }

  // JWT 过期 — 显示一键刷新
  if (jwtStatus === "expired" || jwtStatus === "refreshing") {
    const isRefreshing = jwtStatus === "refreshing";
    return (
      <div className="pb-24 md:pb-8 max-w-md mx-auto py-16 px-4 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "rgba(239,68,68,0.10)" }}>
          <KeyRound className="w-6 h-6" style={{ color: "#ef4444" }} />
        </div>
        <h1 className="text-[16px] font-bold mb-2" style={{ color: "var(--text-primary)" }}>凭证已过期</h1>
        <p className="text-[12px] mb-1" style={{ color: "var(--text-tertiary)" }}>
          {isElectron
            ? "点击下方按钮登录智慧南工，自动同步凭证"
            : "请在浏览器中重新登录图书馆系统"}
        </p>
        {refreshError && (
          <p className="text-[11px] mt-1 mb-3" style={{ color: "#ef4444" }}>{refreshError}</p>
        )}
        <button onClick={handleRefreshJWT}
          className="px-4 py-2 rounded-xl text-[13px] font-medium inline-flex items-center gap-1.5"
          style={{ background: "var(--accent)", color: "#fff" }}>
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "登录中...（如窗口已关闭请重试）" : "登录刷新"}
        </button>
        {!isElectron && (
          <p className="text-[11px] mt-3" style={{ color: "var(--text-tertiary)" }}>
            提示：使用 ScholarFlow 桌面版可自动刷新凭证
          </p>
        )}
      </div>
    );
  }

  // 其他错误
  if (error) {
    return (
      <div className="pb-24 md:pb-8 max-w-md mx-auto py-16 px-4 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "rgba(239,68,68,0.10)" }}>
          <AlertCircle className="w-6 h-6" style={{ color: "#ef4444" }} />
        </div>
        <h1 className="text-[16px] font-bold mb-2" style={{ color: "var(--text-primary)" }}>加载失败</h1>
        <p className="text-[12px] mb-4" style={{ color: "var(--text-tertiary)" }}>{error}</p>
        <button onClick={fetchData} className="px-4 py-2 rounded-xl text-[13px] font-medium inline-flex items-center gap-1.5"
          style={{ background: "var(--accent)", color: "#fff" }}>
          <RefreshCw className="w-3.5 h-3.5" />重试
        </button>
      </div>
    );
  }

  // 未配置
  if (!data) {
    return (
      <div className="pb-24 md:pb-8 max-w-md mx-auto py-16 px-4 text-center">
        <div className="text-5xl mb-4">📚</div>
        <h1 className="text-[16px] font-bold mb-2" style={{ color: "var(--text-primary)" }}>图书馆座位</h1>
        <p className="text-[12px] mb-4" style={{ color: "var(--text-secondary)" }}>
          需要先同步图书馆登录凭证
        </p>
        <button onClick={handleRefreshJWT}
          className="px-4 py-2 rounded-xl text-[13px] font-medium inline-flex items-center gap-1.5"
          style={{ background: "var(--accent)", color: "#fff" }}>
          <KeyRound className="w-3.5 h-3.5" />刷新凭证
        </button>
      </div>
    );
  }

  if (!data?.libs?.length) {
    return (
      <div className="pb-24 md:pb-8 py-8 text-center">
        <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>暂无数据</p>
      </div>
    );
  }

  const { summary, libs } = data;
  const openLibs = libs.filter((l: LibraryRoom) => l.is_open);
  const c = (pct: number) => pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "#22c55e";

  return (
    <div className="pb-24 md:pb-8 max-w-5xl mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>📚 图书馆座位</h1>
        <div className="flex items-center gap-2">
          {isElectron && (
            <button onClick={handleRefreshJWT} title="刷新登录凭证"
              className="px-3 py-2 rounded-xl text-[13px] font-medium inline-flex items-center gap-1"
              style={{ backgroundColor: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
              <KeyRound className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={fetchData} className="px-4 py-2 rounded-xl text-[13px] font-medium inline-flex items-center gap-1.5"
            style={{ backgroundColor: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
            <RefreshCw className="w-3.5 h-3.5" />刷新
          </button>
        </div>
      </div>
      {/* 数据时效提示 */}
      {data.updated && (
        <div className="mb-4 text-[11px] flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
          <span>⏱ 上次更新：{new Date(data.updated).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</span>
          {Date.now() - new Date(data.updated).getTime() > 5 * 60 * 1000 && (
            <span style={{ color: "#f59e0b" }}>· 数据可能已过期</span>
          )}
        </div>
      )}
      <div className="rounded-2xl p-5 mb-6" style={{ background: "var(--surface-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xs)" }}>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold" style={{ color: c((1 - summary.rate) * 100) }}>{summary.avail}</div>
            <div className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>可用座位</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>{summary.used}</div>
            <div className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>已用</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold" style={{ color: "var(--text-secondary)" }}>{summary.total}</div>
            <div className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>总计</div>
          </div>
          <div className="flex-1">
            <div className="h-3 rounded-full overflow-hidden" style={{ background: "var(--surface)" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${((1 - summary.rate) * 100).toFixed(0)}%`, backgroundColor: c((1 - summary.rate) * 100) }} />
            </div>
            <div className="text-xs mt-2" style={{ color: "var(--text-tertiary)" }}>
              空闲率 {(summary.rate * 100).toFixed(1)}% · {data.updated?.slice(11, 19) || ""}
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {openLibs.map((lib: LibraryRoom) => {
          const rt = lib.lib_rt, pct = rt.seats_total > 0 ? (rt.seats_used / rt.seats_total) * 100 : 0;
          return (
            <div key={lib.lib_id} onClick={() => router.push(`/library/layout?lib_id=${lib.lib_id}`)}
              className="rounded-xl p-4 cursor-pointer hover:opacity-80 transition-opacity" style={{ background: "var(--surface-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xs)" }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                  <span className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{lib.lib_name}</span>
                </div>
                <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{lib.lib_floor}</span>
              </div>
              <div className="h-2 rounded-full mb-2" style={{ background: "var(--surface)" }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: c(pct) }} />
              </div>
              <div className="flex justify-between text-xs" style={{ color: "var(--text-tertiary)" }}>
                <span style={{ color: c(pct), fontWeight: 600 }}>{rt.seats_has} 可用</span>
                <span>{rt.seats_used}/{rt.seats_total}</span>
                <span>{rt.open_time_str} - {rt.close_time_str}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
