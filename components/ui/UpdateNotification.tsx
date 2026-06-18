"use client";

import { Download, RefreshCw, X, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";

type UpdateState = "idle" | "available" | "downloading" | "downloaded";

export function UpdateNotification() {
  const [state, setState] = useState<UpdateState>("idle");
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [dismissed, setDismissed] = useState(false);

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
    });

    const unsubscribeDownloaded = api.onUpdateDownloaded((info) => {
      setUpdateInfo(info);
      setState("downloaded");
      setProgress(null);
    });

    return () => {
      unsubscribeAvailable();
      unsubscribeProgress();
      unsubscribeDownloaded();
    };
  }, [dismissed]);

  const handleDownload = async () => {
    if (window.electronAPI?.updateDownload) {
      setState("downloading");
      await window.electronAPI.updateDownload();
    }
  };

  const handleInstall = async () => {
    await window.electronAPI?.updateInstall?.();
  };

  if (state === "idle" || dismissed) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] w-[340px] rounded-2xl overflow-hidden animate-fade-up bg-card border border-border shadow-lg">
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
              onClick={() => setDismissed(true)}
              className="px-4 py-2 rounded-xl text-[12px] text-muted-foreground"
            >
              稍后
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
                {progress ? `${progress.percent}%` : "准备中..."}
              </p>
            </div>
          </div>
          <div className="w-full rounded-full bg-secondary overflow-hidden h-2">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progress?.percent ?? 0}%` }}
            />
          </div>
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
    </div>
  );
}
