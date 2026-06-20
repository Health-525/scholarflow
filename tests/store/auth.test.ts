/**
 * store/auth.ts 回归测试
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("auth store hydration", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("rehydrate 后 _hasHydrated 为 true", async () => {
    vi.resetModules();
    const { useAuthStore } = await import("@/store/auth");

    // Zustand persist 在 jsdom 中同步完成 rehydrate
    expect(useAuthStore.getState()._hasHydrated).toBe(true);
  });

  it("setAuth 更新 schoolId、userId 与 isAuthenticated", async () => {
    vi.resetModules();
    const { useAuthStore } = await import("@/store/auth");
    await new Promise((resolve) => setTimeout(resolve, 0));

    useAuthStore.getState().setAuth("njtech", "202321144057");

    const state = useAuthStore.getState();
    expect(state.schoolId).toBe("njtech");
    expect(state.userId).toBe("202321144057");
    expect(state.isAuthenticated).toBe(true);
  });

  it("clearAuth 清空认证信息", async () => {
    vi.resetModules();
    const { useAuthStore } = await import("@/store/auth");
    await new Promise((resolve) => setTimeout(resolve, 0));

    useAuthStore.getState().setAuth("njtech", "202321144057");
    useAuthStore.getState().clearAuth();

    const state = useAuthStore.getState();
    expect(state.schoolId).toBeNull();
    expect(state.userId).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});
