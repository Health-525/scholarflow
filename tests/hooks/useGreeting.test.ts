import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import fc from "fast-check";

import { useGreeting } from "@/hooks/useGreeting";

function mockDateAt(hour: number) {
  const date = new Date(2026, 6, 1, hour, 0, 0);
  vi.setSystemTime(date);
  return date;
}

describe("useGreeting", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Feature: scholarflow-full-optimization, Property 6: useGreeting 时段边界与原始实现等价
  it("Property 6: 时段边界与原始实现等价", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 23 }), (h) => {
        mockDateAt(h);
        const { result } = renderHook(() => useGreeting());

        const expectedText =
          h < 6
            ? "夜深了"
            : h < 9
              ? "早安"
              : h < 12
                ? "上午好"
                : h < 14
                  ? "中午好"
                  : h < 18
                    ? "下午好"
                    : h < 22
                      ? "晚上好"
                      : "夜深了";

        expect(result.current.text).toBe(expectedText);
      }),
      { numRuns: 100 },
    );
  });

  it("返回当前日期字符串", () => {
    const date = mockDateAt(10);
    const { result } = renderHook(() => useGreeting());

    expect(result.current.date).toBe(
      date.toLocaleDateString("zh-CN", {
        month: "long",
        day: "numeric",
        weekday: "long",
      }),
    );
  });

  it("每分钟更新一次问候语", () => {
    mockDateAt(8);
    const { result } = renderHook(() => useGreeting());
    expect(result.current.text).toBe("早安");

    act(() => {
      vi.advanceTimersByTime(59 * 60 * 1000);
    });
    expect(result.current.text).toBe("早安");

    act(() => {
      vi.advanceTimersByTime(2 * 60 * 1000);
    });
    expect(result.current.text).toBe("上午好");
  });
});
