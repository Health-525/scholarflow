"use client";

import { WifiOff, RefreshCw } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 animate-page">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center bg-primary/10">
          <WifiOff className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-xl font-bold font-display text-foreground mb-2">网络连接中断</h1>
        <p className="text-[13px] text-muted-foreground mb-6 leading-relaxed">
          ScholarFlow 已缓存部分数据供离线使用。课表、作业和跑步数据仍可查看，但无法同步最新更新。
        </p>
        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-xl text-[13px] font-medium inline-flex items-center gap-2 bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            重新连接
          </button>
          <p className="text-[11px] text-muted-foreground">
            已缓存的数据仍可正常浏览
          </p>
        </div>
      </div>
    </div>
  );
}