/**
 * AI 配置读写（DeepSeek API Key + 模型选择）。
 *
 * API Key 经 AES-256-GCM 加密后存储在 SQLite data_store，
 * 仅服务端解密，不向前端暴露明文。
 */

import { DEFAULT_DEEPSEEK_MODEL } from "@/lib/chat/server-llm";
import { decryptApiKey, encryptApiKey } from "@/lib/crypto-api-key";
import type { ServerDB } from "@/lib/server-db";

const CONFIG_KEY = "ai-config";

export interface AIConfig {
  apiKey: string;
  model: string;
}

export interface AISafeConfig {
  model: string;
  configured: boolean;
}

interface StoredAIConfig {
  encryptedKey?: string;
  model?: string;
}

function configKey(prefix: string): string {
  return `${CONFIG_KEY}:${prefix}`;
}

export function getAIConfig(db: ServerDB, prefix: string): AIConfig {
  const raw = db.readData(configKey(prefix)) as StoredAIConfig | null;
  const apiKey = raw?.encryptedKey ? decryptApiKey(raw.encryptedKey) || "" : "";
  return {
    apiKey,
    model: raw?.model || DEFAULT_DEEPSEEK_MODEL,
  };
}

export function getAISafeConfig(db: ServerDB, prefix: string): AISafeConfig {
  const raw = db.readData(configKey(prefix)) as StoredAIConfig | null;
  return {
    model: raw?.model || DEFAULT_DEEPSEEK_MODEL,
    configured: !!raw?.encryptedKey,
  };
}

export function saveAIConfig(
  db: ServerDB,
  prefix: string,
  config: { apiKey?: string; model?: string }
): void {
  const existing = (db.readData(configKey(prefix)) as StoredAIConfig | null) || {};
  const next: StoredAIConfig = {
    model: config.model || existing.model || DEFAULT_DEEPSEEK_MODEL,
  };
  if (config.apiKey !== undefined) {
    if (config.apiKey.trim()) {
      next.encryptedKey = encryptApiKey(config.apiKey.trim());
    } else {
      // 空字符串表示清除 key
      next.encryptedKey = undefined;
    }
  } else if (existing.encryptedKey) {
    next.encryptedKey = existing.encryptedKey;
  }
  db.writeData(configKey(prefix), next);
}
