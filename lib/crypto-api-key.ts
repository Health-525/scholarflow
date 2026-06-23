/**
 * API Key 本地加密存储 — AES-256-GCM。
 *
 * 与密码加密隔离（使用不同的 key derivation 常量），
 * 密钥从本机特征值（hostname + username）经 scrypt 派生，
 * 并引入随机 salt，使 db 文件被拷贝到其他机器后难以解密。
 */

import crypto from "crypto";
import os from "os";

const KEY_LENGTH = 32; // AES-256
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 16;
const MAGIC = Buffer.from("SFK", "utf8");

function keyMaterial(): string {
  return `${os.hostname()}\0${os.userInfo().username}\0scholarflow-api-key-v1`;
}

function deriveKey(salt: Buffer): Buffer {
  return crypto.scryptSync(keyMaterial(), salt, KEY_LENGTH, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
}

export function encryptApiKey(plaintext: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([MAGIC, salt, iv, authTag, encrypted]).toString("base64");
}

export function decryptApiKey(encoded: string): string | null {
  try {
    const buf = Buffer.from(encoded, "base64");
    const hasMagic = buf.subarray(0, MAGIC.length).toString() === MAGIC.toString();
    if (!hasMagic) return null;

    const salt = buf.subarray(MAGIC.length, MAGIC.length + SALT_LENGTH);
    const iv = buf.subarray(MAGIC.length + SALT_LENGTH, MAGIC.length + SALT_LENGTH + IV_LENGTH);
    const authTag = buf.subarray(
      MAGIC.length + SALT_LENGTH + IV_LENGTH,
      MAGIC.length + SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
    );
    const encrypted = buf.subarray(MAGIC.length + SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
    const key = deriveKey(salt);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
