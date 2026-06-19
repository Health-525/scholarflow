"use client";

import { KeyRound, RefreshCw, AlertCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type JWTStatus = "unknown" | "expired" | "refreshing" | "ok" | "error";

export interface JWTStatusBarProps {
  status: JWTStatus;
  onRefresh: () => void;
  isElectron?: boolean;
  refreshError?: string | null;
}

const statusConfig: Record<JWTStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof KeyRound }> = {
  unknown: { label: "凭证状态未知", variant: "secondary", icon: KeyRound },
  ok: { label: "凭证正常", variant: "default", icon: KeyRound },
  expired: { label: "凭证已过期", variant: "destructive", icon: AlertCircle },
  refreshing: { label: "正在刷新凭证", variant: "outline", icon: RefreshCw },
  error: { label: "凭证刷新失败", variant: "destructive", icon: AlertCircle },
};

export function JWTStatusBar({
  status,
  onRefresh,
  refreshError,
}: JWTStatusBarProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="flex items-center justify-between gap-3 p-3 mb-4 rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 min-w-0">
        <Icon
          className={`w-4 h-4 shrink-0 ${status === "refreshing" ? "animate-spin" : ""}`}
        />
        <div className="min-w-0">
          <Badge variant={config.variant} className="text-[11px]">
            {config.label}
          </Badge>
          {refreshError && (
            <p className="text-[11px] mt-1 text-destructive truncate">
              {refreshError}
            </p>
          )}
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={status === "refreshing"}
      >
        <RefreshCw
          className={`w-3.5 h-3.5 mr-1 ${status === "refreshing" ? "animate-spin" : ""}`}
        />
        {status === "refreshing" ? "刷新中..." : "刷新凭证"}
      </Button>
    </div>
  );
}
