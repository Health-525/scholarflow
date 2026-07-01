import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import fc from "fast-check";

import { useConfirmDialogState } from "@/app/reports/daily/useConfirmDialogState";

describe("useConfirmDialogState", () => {
  // Feature: scholarflow-full-optimization, Property 7: ConfirmDialog 确认操作的状态转换正确性
  it("Property 7: 确认放弃修改后状态正确转换", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (newDate) => {
        const { result } = renderHook(() => useConfirmDialogState());
        const applySpy = vi.fn();

        act(() => {
          result.current.requestSelectDate(newDate, true, applySpy);
        });

        expect(result.current.confirmState).toEqual({ type: "discard-edit", pendingDate: newDate });
        expect(applySpy).not.toHaveBeenCalled();

        act(() => {
          result.current.closeConfirm();
        });

        expect(result.current.confirmState).toBeNull();
      }),
      { numRuns: 50 },
    );
  });

  // Feature: scholarflow-full-optimization, Property 8: ConfirmDialog 取消操作保持状态不变
  it("Property 8: 取消/关闭不改变状态", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (date) => {
        const { result } = renderHook(() => useConfirmDialogState());
        const applySpy = vi.fn();
        const generateSpy = vi.fn();

        act(() => {
          result.current.requestSelectDate(date, true, applySpy);
        });

        // dialog 已打开
        expect(result.current.confirmState).not.toBeNull();

        act(() => {
          result.current.closeConfirm();
        });

        // 关闭后状态应为 null
        expect(result.current.confirmState).toBeNull();
        // 取消时不应触发应用或生成
        expect(applySpy).not.toHaveBeenCalled();
        expect(generateSpy).not.toHaveBeenCalled();

        return true;
      }),
      { numRuns: 50 },
    );
  });

  it("isDirty=false 时切换日期直接应用，不打开 dialog", () => {
    const { result } = renderHook(() => useConfirmDialogState());
    const applySpy = vi.fn();

    act(() => {
      result.current.requestSelectDate("2026-07-02", false, applySpy);
    });

    expect(result.current.confirmState).toBeNull();
    expect(applySpy).toHaveBeenCalledWith("2026-07-02");
  });

  it("isDirty=true 时生成日报打开覆盖确认 dialog", () => {
    const { result } = renderHook(() => useConfirmDialogState());
    const generateSpy = vi.fn();

    act(() => {
      result.current.requestGenerate(true, generateSpy);
    });

    expect(result.current.confirmState).toEqual({ type: "overwrite-generate" });
    expect(generateSpy).not.toHaveBeenCalled();
  });

  it("isDirty=false 时生成日报直接执行", () => {
    const { result } = renderHook(() => useConfirmDialogState());
    const generateSpy = vi.fn();

    act(() => {
      result.current.requestGenerate(false, generateSpy);
    });

    expect(result.current.confirmState).toBeNull();
    expect(generateSpy).toHaveBeenCalled();
  });
});
