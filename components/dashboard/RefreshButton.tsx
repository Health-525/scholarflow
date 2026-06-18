"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { showToast } from "@/components/ui/ToastContainer";
import { useRefreshData } from "@/hooks/useQueries";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";

/**
 * 全局手动刷新控件（本地优先架构）。
 *
 * 启动时不再自动抓取教务系统数据，用户需主动点击此按钮才会联网更新。
 * - 进行中：按钮禁用 + 图标 animate-spin（Refresh_Status = 进行中）
 * - 成功：toast 成功提示，并由 useRefreshData 内部 invalidate 刷新界面
 * - 失败：toast 失败提示，且保留既有本地缓存（不破坏现有数据）
 *
 * Requirements: 2.1, 2.3, 2.4, 2.5, 2.6, 5.6
 */
export function RefreshButton({ className }: { className?: string }) {
  const { schoolId, username } = useAuthStore((s) => s);
  const refreshData = useRefreshData();
  const isPending = refreshData.isPending;

  const handleRefresh = async () => {
    if (isPending) return;
    if (!schoolId || !username) {
      showToast("warning", "请先登录学校账号");
      return;
    }

    try {
      // cookie 留空：服务端按本地凭证/记住密码策略处理（含 cookie 过期静默重登）
      const result = await refreshData.mutateAsync({ schoolId, cookie: "", username });
      if (result?.success) {
        showToast("success", `数据刷新成功：${result.fetched?.join("、") || "全部"}`);
      } else if (result?.needsManualLogin) {
        showToast("warning", "登录已过期，请重新登录后再刷新");
      } else {
        showToast("error", `刷新失败：${result?.error || "未知错误"}`);
      }
    } catch (e) {
      // 抓取失败不破坏既有本地缓存
      showToast("error", `刷新失败：${e instanceof Error ? e.message : "未知错误"}`);
    }
  };

  return (
    <Button
      variant="outline"
      size="icon-lg"
      onClick={handleRefresh}
      disabled={isPending}
      aria-label="刷新数据"
      aria-busy={isPending}
      title={isPending ? "刷新中…" : "从教务系统刷新数据"}
      className={cn(
        "rounded-[18px] backdrop-blur-xl bg-card/80 dark:bg-card/60",
        className
      )}
    >
      <RefreshCw className={cn("w-5 h-5 text-primary", isPending && "animate-spin")} />
    </Button>
  );
}

export default RefreshButton;
