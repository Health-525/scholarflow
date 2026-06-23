import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAdapterLogin = vi.fn();
const mockSetRememberSetting = vi.fn();
const mockSaveCredentials = vi.fn();
const rateLimitStore = new Map<string, unknown>();

const mockReadData = vi.fn((key: string) => (rateLimitStore.has(key) ? rateLimitStore.get(key) : null));
const mockWriteData = vi.fn((key: string, value: unknown) => {
  rateLimitStore.set(key, value);
});
const mockDeleteData = vi.fn((key: string) => {
  rateLimitStore.delete(key);
  return true;
});

vi.mock("@/lib/auth/origin", () => ({
  isTrustedOrigin: vi.fn(() => true),
  forbiddenResponse: vi.fn(() => new Response(JSON.stringify({ error: "forbidden" }), { status: 403 })),
}));

vi.mock("@/lib/server-db", () => ({
  getServerDB: vi.fn(() => ({
    readData: mockReadData,
    writeData: mockWriteData,
    deleteData: mockDeleteData,
    saveCredentials: mockSaveCredentials,
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

function createRequest(credentials: Record<string, string>) {
  return new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      origin: "http://localhost:3000",
    },
    body: JSON.stringify({
      schoolId: "hebau",
      credentials,
    }),
  });
}

describe("POST /api/auth/login rate limit", () => {
  beforeEach(() => {
    mockAdapterLogin.mockReset();
    mockSetRememberSetting.mockReset();
    mockSaveCredentials.mockReset();
    mockReadData.mockClear();
    mockWriteData.mockClear();
    mockDeleteData.mockClear();
    rateLimitStore.clear();
  });

  it("连续密码失败超过阈值后返回 429，并阻止继续请求学校登录", async () => {
    mockAdapterLogin.mockRejectedValue(new Error("学号或密码不正确"));

    const { POST } = await import("@/app/api/auth/login/route");

    for (let i = 0; i < 5; i++) {
      const response = await POST(createRequest({ username: "2023084010117", password: "wrong-password" }));
      expect(response.status).toBe(500);
    }

    const limitedResponse = await POST(createRequest({ username: "2023084010117", password: "wrong-password" }));
    expect(limitedResponse.status).toBe(429);
    await expect(limitedResponse.json()).resolves.toMatchObject({
      error: "登录尝试过多，请稍后再试",
      retryAfter: expect.any(Number),
    });
    expect(mockAdapterLogin).toHaveBeenCalledTimes(5);
  });

  it("MFA 验证失败超过阈值后返回 429，并阻止继续校验动态码", async () => {
    mockAdapterLogin.mockRejectedValue(new Error("河北农大验证码校验失败"));

    const { POST } = await import("@/app/api/auth/login/route");

    for (let i = 0; i < 6; i++) {
      const response = await POST(
        createRequest({
          username: "2023084010117",
          password: "correct-password",
          challengeId: "challenge-id",
          dynamicCode: "000000",
        })
      );
      expect(response.status).toBe(500);
    }

    const limitedResponse = await POST(
      createRequest({
        username: "2023084010117",
        password: "correct-password",
        challengeId: "challenge-id",
        dynamicCode: "000000",
      })
    );
    expect(limitedResponse.status).toBe(429);
    await expect(limitedResponse.json()).resolves.toMatchObject({
      error: "验证码尝试过多，请稍后再试",
      retryAfter: expect.any(Number),
    });
    expect(mockAdapterLogin).toHaveBeenCalledTimes(6);
    expect(mockDeleteData).toHaveBeenCalledWith("hebau-mfa:challenge-id");
  });

  it("正确密码触发 MFA 时会清空密码失败计数，避免已验证密码后仍被密码限流阻塞", async () => {
    mockAdapterLogin
      .mockRejectedValueOnce(new Error("学号或密码不正确"))
      .mockRejectedValueOnce(new Error("学号或密码不正确"))
      .mockRejectedValueOnce(new Error("学号或密码不正确"))
      .mockRejectedValueOnce(new Error("学号或密码不正确"))
      .mockRejectedValueOnce(new Error("MFA_REQUIRED::challenge-id::138****0000"))
      .mockRejectedValueOnce(new Error("学号或密码不正确"));

    const { POST } = await import("@/app/api/auth/login/route");

    for (let i = 0; i < 4; i++) {
      const response = await POST(createRequest({ username: "2023084010117", password: "wrong-password" }));
      expect(response.status).toBe(500);
    }

    const mfaResponse = await POST(createRequest({ username: "2023084010117", password: "correct-password" }));
    expect(mfaResponse.status).toBe(200);
    await expect(mfaResponse.json()).resolves.toMatchObject({
      requiresMfa: true,
      challengeId: "challenge-id",
    });

    const nextPasswordFailure = await POST(createRequest({ username: "2023084010117", password: "wrong-password" }));
    expect(nextPasswordFailure.status).toBe(500);
    expect(mockAdapterLogin).toHaveBeenCalledTimes(6);
  });
});
