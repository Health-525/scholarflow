import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSaveCredentials = vi.fn();
const mockDeleteData = vi.fn();
const mockReadData = vi.fn(() => null);
const mockWriteData = vi.fn();
const mockAdapterLogin = vi.fn();
const mockSetRememberSetting = vi.fn();

vi.mock("@/lib/auth/origin", () => ({
  isTrustedOrigin: vi.fn(() => true),
  forbiddenResponse: vi.fn(() => new Response(JSON.stringify({ error: "forbidden" }), { status: 403 })),
}));

vi.mock("@/lib/server-db", () => ({
  getServerDB: vi.fn(() => ({
    readData: mockReadData,
    writeData: mockWriteData,
    saveCredentials: mockSaveCredentials,
    deleteData: mockDeleteData,
  })),
}));

vi.mock("@/lib/schools/registry", () => ({
  getAdapter: vi.fn(() => ({
    login: mockAdapterLogin,
  })),
}));

vi.mock("@/lib/auto-refresh/state", () => ({
  setRememberSetting: mockSetRememberSetting,
}));

describe("POST /api/auth/login password storage", () => {
  beforeEach(() => {
    mockSaveCredentials.mockReset();
    mockDeleteData.mockReset();
    mockReadData.mockReset();
    mockWriteData.mockReset();
    mockAdapterLogin.mockReset();
    mockSetRememberSetting.mockReset();

    mockAdapterLogin.mockResolvedValue({
      schoolId: "hebau",
      data: { username: "2023084010117", cookie: "cookie-value", sessionCookie: "session-id" },
      expiresAt: Date.now() + 60_000,
    });
  });

  it("勾选记住密码时也不会把密码写入 SQLite，只清理旧缓存键", async () => {
    const { POST } = await import("@/app/api/auth/login/route");

    const request = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        schoolId: "hebau",
        credentials: {
          username: "2023084010117",
          password: "plain-password",
        },
        remember: true,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      schoolId: "hebau",
      userId: "2023084010117",
    });

    expect(mockSaveCredentials).toHaveBeenCalled();
    expect(mockSetRememberSetting).toHaveBeenCalledWith("hebau", "2023084010117", {
      enabled: true,
      lastManualLoginAt: expect.any(Number),
    });
    expect(mockDeleteData).toHaveBeenCalledWith("credential-password:hebau:2023084010117");
  });

  it("持久化时优先使用服务端确认后的用户名，避免 MFA 二次提交错绑账号", async () => {
    mockAdapterLogin.mockResolvedValueOnce({
      schoolId: "hebau",
      data: { username: "2023084010117", cookie: "cookie-value", sessionCookie: "session-id" },
      expiresAt: Date.now() + 60_000,
    });

    const { POST } = await import("@/app/api/auth/login/route");

    const request = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        schoolId: "hebau",
        credentials: {
          username: "tampered-user",
          password: "plain-password",
          challengeId: "challenge-id",
          dynamicCode: "123456",
        },
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      schoolId: "hebau",
      userId: "2023084010117",
    });

    expect(mockSaveCredentials).toHaveBeenCalledWith(
      "hebau",
      "2023084010117",
      { username: "2023084010117", cookie: "cookie-value", sessionCookie: "session-id" },
      expect.any(Number)
    );
    expect(mockDeleteData).toHaveBeenCalledWith("credential-password:hebau:2023084010117");
  });
});
