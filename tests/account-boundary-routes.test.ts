import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindActiveCredentials = vi.fn();
const mockFindMostRecentCredential = vi.fn();
const mockGetCredentials = vi.fn();
const mockDeleteCredentials = vi.fn();
const mockDeleteData = vi.fn();
const mockReadData = vi.fn();
const mockSeedFromTimetable = vi.fn();
const mockAdapterFetchSchedule = vi.fn();
const mockGetRememberSetting = vi.fn();
const mockSetRememberSetting = vi.fn();

vi.mock("@/lib/auth/origin", () => ({
  isTrustedOrigin: vi.fn(() => true),
  hasValidInternalToken: vi.fn(() => false),
  forbiddenResponse: vi.fn((body: Record<string, unknown> = { error: "forbidden" }) =>
    new Response(JSON.stringify(body), { status: 403 })
  ),
}));

vi.mock("@/lib/server-db", () => ({
  getServerDB: vi.fn(() => ({
    findActiveCredentials: mockFindActiveCredentials,
    findMostRecentCredential: mockFindMostRecentCredential,
    getCredentials: mockGetCredentials,
    deleteCredentials: mockDeleteCredentials,
    deleteData: mockDeleteData,
    readData: mockReadData,
    seedFromTimetable: mockSeedFromTimetable,
  })),
}));

vi.mock("@/lib/schools/registry", () => ({
  getAdapter: vi.fn(() => ({
    fetchSchedule: mockAdapterFetchSchedule,
    periodTimes: {},
    getCurrentSemester: vi.fn(() => ({ year: "2025", semester: "2", week1Monday: "2026-03-02" })),
  })),
}));

vi.mock("@/lib/dashboard/summary", () => ({
  getDashboardSummary: vi.fn(() => ({ cards: [] })),
}));

vi.mock("@/lib/auto-refresh/state", () => ({
  getRememberSetting: mockGetRememberSetting,
  setRememberSetting: mockSetRememberSetting,
}));

describe("account boundary routes", () => {
  beforeEach(() => {
    mockFindActiveCredentials.mockReset();
    mockFindMostRecentCredential.mockReset();
    mockGetCredentials.mockReset();
    mockDeleteCredentials.mockReset();
    mockDeleteData.mockReset();
    mockReadData.mockReset();
    mockSeedFromTimetable.mockReset();
    mockAdapterFetchSchedule.mockReset();
    mockGetRememberSetting.mockReset();
    mockSetRememberSetting.mockReset();

    mockFindActiveCredentials.mockReturnValue({
      schoolId: "hebau",
      userId: "2023084010117",
      username: "2023084010117",
      expiresAt: Date.now() + 60_000,
    });
    mockFindMostRecentCredential.mockReturnValue(null);
    mockGetRememberSetting.mockReturnValue({ enabled: true, lastManualLoginAt: Date.now() });
  });

  it("拒绝通过 /api/local-data 跨账号读取保存的 credentials", async () => {
    const { GET } = await import("@/app/api/local-data/route");

    const response = await GET(
      new Request("http://localhost:3000/api/local-data?type=credentials&schoolId=hebau&userId=other-user", {
        headers: { origin: "http://localhost:3000" },
      })
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "unauthorized account access" });
    expect(mockGetCredentials).not.toHaveBeenCalled();
  });

  it("拒绝通过 /api/fetch/schedule 使用其他账号的已保存凭证抓取课表", async () => {
    const { POST } = await import("@/app/api/fetch/schedule/route");

    const response = await POST(
      new Request("http://localhost:3000/api/fetch/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          schoolId: "hebau",
          username: "other-user",
        }),
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "unauthorized" });
    expect(mockGetCredentials).not.toHaveBeenCalled();
    expect(mockAdapterFetchSchedule).not.toHaveBeenCalled();
  });

  it("拒绝通过 /api/auth/logout 登出其他账号", async () => {
    const { POST } = await import("@/app/api/auth/logout/route");

    const response = await POST(
      new Request("http://localhost:3000/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          schoolId: "hebau",
          userId: "other-user",
        }),
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "unauthorized" });
    expect(mockDeleteCredentials).not.toHaveBeenCalled();
    expect(mockDeleteData).not.toHaveBeenCalled();
    expect(mockSetRememberSetting).not.toHaveBeenCalled();
  });

  it("拒绝通过 /api/auth/remember 清除其他账号的记住密码状态", async () => {
    const { POST } = await import("@/app/api/auth/remember/route");

    const response = await POST(
      new Request("http://localhost:3000/api/auth/remember", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          schoolId: "hebau",
          userId: "other-user",
        }),
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "unauthorized" });
    expect(mockDeleteData).not.toHaveBeenCalled();
    expect(mockSetRememberSetting).not.toHaveBeenCalled();
  });

  it("允许当前账号清除自己的记住密码状态，并删除历史密码缓存键", async () => {
    const { POST } = await import("@/app/api/auth/remember/route");

    const response = await POST(
      new Request("http://localhost:3000/api/auth/remember", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          schoolId: "hebau",
          userId: "2023084010117",
        }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mockDeleteData).toHaveBeenCalledWith("credential-password:hebau:2023084010117");
    expect(mockSetRememberSetting).toHaveBeenCalledWith("hebau", "2023084010117", {
      enabled: false,
      lastManualLoginAt: expect.any(Number),
    });
  });

  it("允许当前账号读取自己的 credentials", async () => {
    mockGetCredentials.mockReturnValue({ username: "2023084010117", cookie: "cookie-value" });

    const { GET } = await import("@/app/api/local-data/route");

    const response = await GET(
      new Request("http://localhost:3000/api/local-data?type=credentials&schoolId=hebau&userId=2023084010117", {
        headers: { origin: "http://localhost:3000" },
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ username: "2023084010117", cookie: "cookie-value" });
    expect(mockGetCredentials).toHaveBeenCalledWith("hebau", "2023084010117");
  });
});
