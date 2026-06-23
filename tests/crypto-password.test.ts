/**
 * 本地密码加密模块测试。
 *
 * 直接测试 lib/crypto-password.ts 的纯函数,无需 better-sqlite3。
 */
import { describe, it, expect } from "vitest";

import { decryptPassword, encryptPassword } from "@/lib/crypto-password";

describe("crypto-password", () => {
  it("加密后不应是明文", () => {
    const plain = "test-plain-password";
    const encrypted = encryptPassword(plain);
    expect(encrypted).not.toBe(plain);
    expect(typeof encrypted).toBe("string");
    expect(encrypted.length).toBeGreaterThan(0);
  });

  it("加密解密往返 — 常见密码", () => {
    const passwords = ["abc123", "P@ssw0rd!测试", "a".repeat(100), ""];
    for (const pw of passwords) {
      const enc = encryptPassword(pw);
      const dec = decryptPassword(enc);
      expect(dec).toBe(pw);
    }
  });

  it("解密空字符串或非法内容返回 null", () => {
    expect(decryptPassword("")).toBeNull();
    expect(decryptPassword("not-a-valid-ciphertext")).toBeNull();
    expect(decryptPassword("dGVzdA==")).toBeNull();
  });

  it("两次加密同一密码应得到不同密文(因随机 salt)", () => {
    const plain = "same-password";
    const enc1 = encryptPassword(plain);
    const enc2 = encryptPassword(plain);
    expect(enc1).not.toBe(enc2);
    expect(decryptPassword(enc1)).toBe(plain);
    expect(decryptPassword(enc2)).toBe(plain);
  });
});
