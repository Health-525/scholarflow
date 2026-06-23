import { beforeEach, describe, expect, it, vi } from "vitest";

const mockLoginHebauWithMfa = vi.fn();

vi.mock("@/lib/schools/hebau/mfa", () => ({
  loginHebauWithMfa: mockLoginHebauWithMfa,
}));

describe("hebauAdapter.login", () => {
  beforeEach(() => {
    mockLoginHebauWithMfa.mockReset();
  });

  it("使用服务端确认后的用户名构造凭证，避免 MFA 二次提交时沿用客户端篡改值", async () => {
    mockLoginHebauWithMfa.mockResolvedValue({
      username: "2023084010117",
      cookie: "cookie-value",
      sessionCookie: "session-id",
    });

    const { hebauAdapter } = await import("@/lib/schools/hebau");
    const session = await hebauAdapter.login({
      username: "tampered-user",
      password: "plain-password",
      challengeId: "challenge-id",
      dynamicCode: "123456",
    });

    expect(mockLoginHebauWithMfa).toHaveBeenCalledWith({
      username: "tampered-user",
      password: "plain-password",
      challengeId: "challenge-id",
      dynamicCode: "123456",
    });
    expect(session).toMatchObject({
      schoolId: "hebau",
      data: {
        username: "2023084010117",
        cookie: "cookie-value",
        sessionCookie: "session-id",
      },
    });
  });
});
