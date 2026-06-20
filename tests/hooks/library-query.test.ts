/**
 * hooks/useLibraryQuery 回归测试
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { useCancelReserve } from "@/hooks/useLibraryQuery";

const LIBRARY_CANCEL_TOKEN_KEY = "scholarflow-library-cancel-token";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("useCancelReserve", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
    localStorage.removeItem(LIBRARY_CANCEL_TOKEN_KEY);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.removeItem(LIBRARY_CANCEL_TOKEN_KEY);
  });

  it("使用调用方传入的 sToken", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCancelReserve(), { wrapper });

    await result.current.mutateAsync({ sToken: "caller-provided-token" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(init).toMatchObject({
      method: "POST",
      body: JSON.stringify({ sToken: "caller-provided-token" }),
    });
  });

  it("未传入 sToken 时回退到 localStorage 中的取消令牌", async () => {
    localStorage.setItem(LIBRARY_CANCEL_TOKEN_KEY, "stored-token");
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCancelReserve(), { wrapper });

    await result.current.mutateAsync({});

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(init).toMatchObject({
      body: JSON.stringify({ sToken: "stored-token" }),
    });
  });

  it("既无传入 sToken 也无 localStorage 令牌时抛出明确错误", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCancelReserve(), { wrapper });

    await expect(result.current.mutateAsync({})).rejects.toThrow("取消令牌已过期或不存在");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
