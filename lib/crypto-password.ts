/**
 * 本地密码加密存储 — AES-256-GCM。
 *
 * 密钥从本机特征值（hostname + username + 固定盐）经 scrypt 派生，
 * 确保同一台机器可解密，db 文件被拷贝到其他机器则无法解密。
 */

import crypto from "crypto";
import os from "os";

const SALT = Buffer.from("ScholarFlow::password-vault::2025", "utf8");
const KEY_LENGTH = 32; // AES-256
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

let _cachedKey: Buffer | null = null;

function deriveKey(): Buffer {
  if (_cachedKey) return _cachedKey;
  const material = `${os.hostname()}\0${os.userInfo().username}\0scholarflow-password-key`;
  _cachedKey = crypto.scryptSync(material, SALT, KEY_LENGTH);
  return _cachedKey;
}

export function encryptPassword(plaintext: string): string {
  const key = deriveKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // 格式: iv(16) + authTag(16) + ciphertext → base64
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptPassword(encoded: string): string | null {
  try {
    const key = deriveKey();
    const buf = Buffer.from(encoded, "base64");
    const iv = buf.subarray(0, IV_LENGTH);
    const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
