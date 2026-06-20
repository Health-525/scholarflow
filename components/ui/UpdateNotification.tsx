"use client";

import { Download, RefreshCw, X, Sparkles, ExternalLink } from "lucide-react";
import { useState, useEffect, useRef } from "react";

type UpdateState = "idle" | "available" | "downloading" | "downloaded" | "error";

const RELEASE_URL = "https://github.com/Health-525/scholarflow/releases/latest";

export function UpdateNotification() {
  const [state, setState] = useState<UpdateState>("idle");
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const downloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const api = window.electronAPI;
    if (!api) return;

    const unsubscribeAvailable = api.onUpdateAvailable((info) => {
      setUpdateInfo(info);
      if (!dismissed) setState("available");
    });

    const unsubscribeProgress = api.onUpdateDownloadProgress((p) => {
      setProgress(p);
      setState("downloading");
      // 收到进度后重置超时计时器
      if (downloadTimer.current) clearTimeout(downloadTimer.current);
      downloadTimer.current = setTimeout(() => {
        setErrorMsg("下载速度较慢，建议手动下载");
        setState("error");
      }, 120_000); // 2 分钟无进度则提示手动下载
    });

    const unsubscribeDownloaded = api.onUpdateDownloaded((info) => {
      if (downloadTimer.current) clearTimeout(downloadTimer.current);
      setUpdateInfo(info);
      setState("downloaded");
      setProgress(null);
    });

    const unsubscribeError = api.onUpdateError?.((err) => {
      if (downloadTimer.current) clearTimeout(downloadTimer.current);
      setErrorMsg(err.message || "更新失败");
      setState("error");
    });

    return () => {
      unsubscribeAvailable();
      unsubscribeProgress();
      unsubscribeDownloaded();
      unsubscribeError?.();
      if (downloadTimer.current) clearTimeout(downloadTimer.current);
    };
  }, [dismissed]);

  const handleDownload = async () => {
    if (window.electronAPI?.updateDownload) {
      setState("downloading");
      setProgress(null);
      // 启动超时计时器：120 秒无进度则提示手动下载
      downloadTimer.current = setTimeout(() => {
        setErrorMsg("下载速度较慢，建议手动下载");
        setState("error");
      }, 120_000);
      await window.electronAPI.updateDownload();
    }
  };

  const handleInstall = async () => {
    await window.electronAPI?.updateInstall?.();
  };

  const handleManualDownload = () => {
    window.open(RELEASE_URL, "_blank");
  };

  if (state === "idle" || dismissed) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] w-[calc(100vw-2rem)] max-w-[340px] rounded-2xl overflow-hidden animate-fade-up bg-card border border-border shadow-lg">
      {/* Available */}
      {state === "available" && (
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-primary/10">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[13px] font-semibold text-foreground">
                发现新版本
              </h3>
              <p className="text-[11px] mt-0.5 text-muted-foreground">
                v{updateInfo?.version} 已发布，点击下载更新
              </p>
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="p-1 rounded-lg shrink-0 text-muted-foreground"
              aria-label="关闭更新提示"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-medium transition-colors bg-primary text-primary-foreground"
            >
              <Download className="w-3.5 h-3.5" />
              下载更新
            </button>
            <button
              onClick={handleManualDownload}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-[12px] text-muted-foreground"
              title="打开 GitHub 下载页面"
            >
              <ExternalLink className="w-3 h-3" />
              手动
            </button>
          </div>
        </div>
      )}

      {/* Downloading */}
      {state === "downloading" && (
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-primary/10">
              <RefreshCw className="w-4 h-4 animate-spin text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-[13px] font-semibold text-foreground">
                正在下载更新
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {progress ? `${progress.percent}% · ${formatSpeed(progress.bytesPerSecond)}` : "准备中..."}
              </p>
            </div>
          </div>
          <div
            className="w-full rounded-full bg-secondary overflow-hidden h-2"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress?.percent ?? 0}
            aria-label="下载进度"
          >
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progress?.percent ?? 0}%` }}
            />
          </div>
          <button
            onClick={handleManualDownload}
            className="w-full mt-3 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] text-muted-foreground"
          >
            <ExternalLink className="w-3 h-3" />
            下载太慢？手动下载
          </button>
        </div>
      )}

      {/* Downloaded */}
      {state === "downloaded" && (
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[var(--status-success)]/10">
              <Sparkles className="w-4 h-4 text-[var(--status-success)]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[13px] font-semibold text-foreground">
                更新已就绪
              </h3>
              <p className="text-[11px] mt-0.5 text-muted-foreground">
                v{updateInfo?.version} 已下载，重启后生效
              </p>
            </div>
          </div>
          <button
            onClick={handleInstall}
            className="w-full mt-3 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-medium transition-colors bg-[var(--status-success)] text-primary-foreground"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            重启并安装
          </button>
        </div>
      )}

      {/* Error / Timeout */}
      {state === "error" && (
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-destructive/10">
              <Download className="w-4 h-4 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[13px] font-semibold text-foreground">
                自动更新失败
              </h3>
              <p className="text-[11px] mt-0.5 text-muted-foreground">
                {errorMsg || "网络异常，请手动下载安装"}
              </p>
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="p-1 rounded-lg shrink-0 text-muted-foreground"
              aria-label="关闭"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleManualDownload}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-medium transition-colors bg-primary text-primary-foreground"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              前往下载
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-2 rounded-xl text-[12px] text-muted-foreground"
            >
              重试
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond >= 1024 * 1024) return `${(bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s`;
  if (bytesPerSecond >= 1024) return `${(bytesPerSecond / 1024).toFixed(0)} KB/s`;
  return `${bytesPerSecond} B/s`;
}
