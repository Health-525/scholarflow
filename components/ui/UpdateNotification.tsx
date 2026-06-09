"use client";

import { useState, useEffect } from "react";
import { Download, RefreshCw, X, Sparkles } from "lucide-react";

interface UpdateInfo {
  version: string;
  releaseNotes?: string | { note: string }[];
}

interface DownloadProgress {
  percent: number;
  bytesPerSecond: number;
}

type UpdateState = "idle" | "available" | "downloading" | "downloaded";

export function UpdateNotification() {
  const [state, setState] = useState<UpdateState>("idle");
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const win = window as unknown as Record<string, unknown>;
    if (!win.electronAPI) return;

    const handleAvailable = (_event: unknown, info: UpdateInfo) => {
      setUpdateInfo(info);
      if (!dismissed) setState("available");
    };

    const handleProgress = (_event: unknown, p: DownloadProgress) => {
      setProgress(p);
      setState("downloading");
    };

    const handleDownloaded = (_event: unknown, info: { version: string }) => {
      setUpdateInfo(info);
      setState("downloaded");
      setProgress(null);
    };

    const api = win.electronAPI as unknown as Record<string, (...args: unknown[]) => void>;
    if (api.onUpdateAvailable) api.onUpdateAvailable(handleAvailable);
    if (api.onUpdateDownloadProgress) api.onUpdateDownloadProgress(handleProgress);
    if (api.onUpdateDownloaded) api.onUpdateDownloaded(handleDownloaded);

    return () => {};
  }, [dismissed]);

  const handleDownload = async () => {
    const win = window as unknown as Record<string, unknown>;
    const api = win.electronAPI as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>;
    if (api.updateDownload) {
      setState("downloading");
      await api.updateDownload();
    }
  };

  const handleInstall = async () => {
    const win = window as unknown as Record<string, unknown>;
    const api = win.electronAPI as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>;
    if (api.updateInstall) {
      await api.updateInstall();
    }
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
          <div className="sf-progress-track">
            <div
              className="sf-progress-fill"
              style={{ width: `${progress?.percent ?? 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Downloaded */}
      {state === "downloaded" && (
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-green-500/10">
              <Sparkles className="w-4 h-4 text-green-500" />
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
            className="w-full mt-3 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-medium transition-colors bg-green-600 text-white"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            重启并安装
          </button>
        </div>
      )}
    </div>
  );
}
