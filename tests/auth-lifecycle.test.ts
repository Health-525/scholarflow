/**
 * 凭证生命周期判定测试。
 *
 * 直接测试 lib/auth/lifecycle.ts 中的纯函数,无需 better-sqlite3 或 ServerDB,
 * 因此不受 Node/Electron ABI 切换影响。
 */
import { describe, it, expect } from "vitest";

import {
  DEFAULT_FORCE_RELOGIN_INTERVAL_MS,
  canSilentRelogin,
  isForceReloginDue,
  type CredentialState,
} from "@/lib/auth/lifecycle";

describe("isForceReloginDue", () => {
  const now = 1_700_000_000_000;
  const interval = DEFAULT_FORCE_RELOGIN_INTERVAL_MS;

  it("lastManualLoginAt 为 null 时视为已到期", () => {
    const state: CredentialState = {
      sessionValid: true,
      cookieExpiresAt: now + 10 * 60 * 1000,
      lastManualLoginAt: null,
      rememberEnabled: true,
    };
    expect(isForceReloginDue(state, now, interval)).toBe(true);
  });

  it("未超过强制重登间隔时返回 false", () => {
    const state: CredentialState = {
      sessionValid: true,
      cookieExpiresAt: now + 10 * 60 * 1000,
      lastManualLoginAt: now - interval + 60 * 1000,
      rememberEnabled: true,
    };
    expect(isForceReloginDue(state, now, interval)).toBe(false);
  });

  it("刚好等于强制重登间隔时返回 false", () => {
    const state: CredentialState = {
      sessionValid: true,
      cookieExpiresAt: now + 10 * 60 * 1000,
      lastManualLoginAt: now - interval,
      rememberEnabled: true,
    };
    expect(isForceReloginDue(state, now, interval)).toBe(false);
  });

  it("超过强制重登间隔时返回 true", () => {
    const state: CredentialState = {
      sessionValid: true,
      cookieExpiresAt: now + 10 * 60 * 1000,
      lastManualLoginAt: now - interval - 1,
      rememberEnabled: true,
    };
    expect(isForceReloginDue(state, now, interval)).toBe(true);
  });
});

describe("canSilentRelogin", () => {
  const now = 1_700_000_000_000;
  const interval = DEFAULT_FORCE_RELOGIN_INTERVAL_MS;

  function baseState(overrides: Partial<CredentialState> = {}): CredentialState {
    return {
      sessionValid: true,
      cookieExpiresAt: now - 10 * 60 * 1000,
      lastManualLoginAt: now - 24 * 60 * 60 * 1000,
      rememberEnabled: true,
      ...overrides,
    };
  }

  it("记住密码未启用时不能静默重登", () => {
    const state = baseState({ rememberEnabled: false });
    expect(canSilentRelogin(state, now, interval)).toBe(false);
  });

  it("记住密码启用但强制重登已到期时不能静默重登", () => {
    const state = baseState({
      lastManualLoginAt: now - interval - 1,
    });
    expect(canSilentRelogin(state, now, interval)).toBe(false);
  });

  it("记住密码启用且未超强制重登间隔时可以静默重登", () => {
    const state = baseState();
    expect(canSilentRelogin(state, now, interval)).toBe(true);
  });

  it("cookie 仍在有效期内也允许静默重登(调度器可主动换新 cookie)", () => {
    const state = baseState({
      cookieExpiresAt: now + 10 * 60 * 1000,
    });
    expect(canSilentRelogin(state, now, interval)).toBe(true);
  });
});
