"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ConfirmDialogProps {
  /** 是否打开 */
  open: boolean;
  /** 打开状态变化 */
  onOpenChange: (open: boolean) => void;
  /** 标题 */
  title: string;
  /** 描述说明 */
  description?: ReactNode;
  /** 确认按钮文案,默认「确定」 */
  confirmText?: string;
  /** 取消按钮文案,默认「取消」 */
  cancelText?: string;
  /** 是否为危险操作(确认按钮红色),默认 true */
  danger?: boolean;
  /** 点击确认 */
  onConfirm: () => void;
}

/**
 * 应用内确认对话框 — 替代原生 window.confirm。
 *
 * 基于 base-ui AlertDialog,带遮罩、焦点陷阱、Esc 关闭、ARIA 角色,
 * 是危险操作二次确认的最佳实践组件(样式可控、不阻塞主线程)。
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "确定",
  cancelText = "取消",
  danger = true,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60 backdrop-blur-sm data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0" />
        <AlertDialog.Popup
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2",
            "rounded-[24px] bg-card p-6 shadow-lg ring-1 ring-border outline-none",
            "data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95"
          )}
        >
          <AlertDialog.Title className="text-[15px] font-semibold font-display text-foreground">
            {title}
          </AlertDialog.Title>
          {description && (
            <AlertDialog.Description className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              {description}
            </AlertDialog.Description>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <AlertDialog.Close
              render={
                <Button variant="secondary" size="sm" />
              }
            >
              {cancelText}
            </AlertDialog.Close>
            <AlertDialog.Close
              onClick={onConfirm}
              render={
                <Button variant={danger ? "destructive" : "default"} size="sm" />
              }
            >
              {confirmText}
            </AlertDialog.Close>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

export default ConfirmDialog;
