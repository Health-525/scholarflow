"use client";

import { useState } from "react";

type ConfirmStateType =
  | { type: "discard-edit"; pendingDate: string }
  | { type: "overwrite-generate" }
  | null;

/** 日报页面 ConfirmDialog 状态机 — 抽离为独立 hook 便于测试 */
export function useConfirmDialogState() {
  const [confirmState, setConfirmState] = useState<ConfirmStateType>(null);

  const requestSelectDate = (date: string, isDirty: boolean, onApply: (date: string) => void) => {
    if (isDirty) {
      setConfirmState({ type: "discard-edit", pendingDate: date });
      return;
    }
    onApply(date);
  };

  const requestGenerate = (isDirty: boolean, onGenerate: () => void) => {
    if (isDirty) {
      setConfirmState({ type: "overwrite-generate" });
      return;
    }
    onGenerate();
  };

  const closeConfirm = () => setConfirmState(null);

  return { confirmState, requestSelectDate, requestGenerate, closeConfirm };
}
