import { beforeEach, describe, expect, it, vi } from "vitest";

const mockReadData = vi.fn();
const mockDeleteData = vi.fn();
const mockListKeys = vi.fn<() => string[]>(() => []);

vi.mock("@/lib/server-db", () => ({
  getServerDB: vi.fn(() => ({
    readData: mockReadData,
    deleteData: mockDeleteData,
    listKeys: mockListKeys,
  })),
}));

describe("河北农大 MFA challenge cleanup", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.resetModules();
    mockReadData.mockReset();
    mockDeleteData.mockReset();
    mockListKeys.mockReset();
    mockListKeys.mockReturnValue([]);
  });

  it("账号不匹配时会删除 challenge，避免带 Cookie 的待验证会话继续滞留", async () => {
    mockReadData.mockReturnValue({
      username: "2023084010117",
      cookies: [],
      serviceUrl: "http://urp.hebau.edu.cn:1009/jwapp/sys/homeapp/index.do",
      reAuthType: "3",
      isMultifactor: "true",
      maskedTarget: "138****0000",
      createdAt: Date.now(),
    });

    const { completeHebauMfaChallenge } = await import("@/lib/schools/hebau/mfa");

    await expect(
      completeHebauMfaChallenge("challenge-id", "123456", "other-user")
    ).rejects.toThrow("河北农大验证码会话与当前账号不匹配，请重新登录");

    expect(mockDeleteData).toHaveBeenCalledWith("hebau-mfa:challenge-id");
  });

  it("会为未过期 challenge 安排 TTL 到期自动删除，避免用户放弃后长期滞留", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-23T12:00:00Z"));

    mockListKeys.mockReturnValue(["hebau-mfa:challenge-id"]);
    mockReadData.mockImplementation((key: string) => {
      if (key !== "hebau-mfa:challenge-id") return null;
      return {
        username: "2023084010117",
        cookies: [],
        serviceUrl: "http://urp.hebau.edu.cn:1009/jwapp/sys/homeapp/index.do",
        reAuthType: "3",
        isMultifactor: "true",
        maskedTarget: "138****0000",
        createdAt: Date.now(),
      };
    });

    await import("@/lib/schools/hebau/mfa");

    expect(mockDeleteData).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000);

    expect(mockDeleteData).toHaveBeenCalledWith("hebau-mfa:challenge-id");
  });
});
