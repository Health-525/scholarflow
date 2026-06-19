import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { isTrustedOrigin, forbiddenResponse, INTERNAL_TOKEN_HEADER } from "@/lib/auth/origin";

describe("isTrustedOrigin", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("允许来自白名单的 Origin", () => {
    const request = new Request("http://localhost:3000/api/test", {
      headers: { origin: "http://localhost:3000" },
    });
    expect(isTrustedOrigin(request)).toBe(true);
  });

  it("拒绝不在白名单的 Origin", () => {
    const request = new Request("http://localhost:3000/api/test", {
      headers: { origin: "http://evil.com" },
    });
    expect(isTrustedOrigin(request)).toBe(false);
  });

  it("无 Origin 时拒绝", () => {
    const request = new Request("http://localhost:3000/api/test");
    expect(isTrustedOrigin(request)).toBe(false);
  });

  it("无 Origin 但有有效内部 token 时允许", () => {
    process.env.SCHOLARFLOW_INTERNAL_TOKEN = "test-token";
    const request = new Request("http://localhost:3000/api/test", {
      headers: { [INTERNAL_TOKEN_HEADER]: "test-token" },
    });
    expect(isTrustedOrigin(request, { allowInternalToken: true })).toBe(true);
  });

  it("无 Origin 但内部 token 不匹配时拒绝", () => {
    process.env.SCHOLARFLOW_INTERNAL_TOKEN = "test-token";
    const request = new Request("http://localhost:3000/api/test", {
      headers: { [INTERNAL_TOKEN_HEADER]: "wrong-token" },
    });
    expect(isTrustedOrigin(request, { allowInternalToken: true })).toBe(false);
  });

  it("无 Origin 且未启用内部 token 时拒绝", () => {
    const request = new Request("http://localhost:3000/api/test");
    expect(isTrustedOrigin(request, { allowInternalToken: false })).toBe(false);
  });

  it("CORS_ORIGIN=* 时允许任何 Origin", () => {
    process.env.CORS_ORIGIN = "*";
    const request = new Request("http://localhost:3000/api/test", {
      headers: { origin: "http://any-origin.com" },
    });
    expect(isTrustedOrigin(request)).toBe(true);
  });

  it("CORS_ORIGIN 包含多个值时匹配", () => {
    process.env.CORS_ORIGIN = "http://localhost:3000,http://example.com";
    const request = new Request("http://localhost:3000/api/test", {
      headers: { origin: "http://example.com" },
    });
    expect(isTrustedOrigin(request)).toBe(true);
  });

  it("开发环境未配置 token 时放行", () => {
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.SCHOLARFLOW_INTERNAL_TOKEN;
    const request = new Request("http://localhost:3000/api/test");
    expect(isTrustedOrigin(request, { allowInternalToken: true })).toBe(true);
  });

  it("生产环境未配置 token 时拒绝", () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.SCHOLARFLOW_INTERNAL_TOKEN;
    const request = new Request("http://localhost:3000/api/test");
    expect(isTrustedOrigin(request, { allowInternalToken: true })).toBe(false);
  });
});

describe("forbiddenResponse", () => {
  it("返回 403 状态码", async () => {
    const response = forbiddenResponse();
    expect(response.status).toBe(403);
  });

  it("返回 JSON 格式", async () => {
    const response = forbiddenResponse();
    expect(response.headers.get("Content-Type")).toBe("application/json");
  });

  it("返回默认错误消息", async () => {
    const response = forbiddenResponse();
    const body = await response.json();
    expect(body).toEqual({ error: "forbidden" });
  });

  it("支持自定义错误消息", async () => {
    const response = forbiddenResponse({ error: "custom error", code: 42 });
    const body = await response.json();
    expect(body).toEqual({ error: "custom error", code: 42 });
  });
});
