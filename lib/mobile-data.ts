/**
 * 移动端数据层 — 用 Capacitor Preferences/FileSystem 替代 Next.js API Routes
 *
 * 在 Electron 模式下走 /api/local-data 和 /api/local-save
 * 在 Capacitor 模式下直接用原生插件读写
 */

import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";

import { getCurrentAuth } from "./api/auth-params";
import { apiFetch } from "./api-client";

export const isNative = Capacitor.isNativePlatform();

// ── 数据读写 ──

const DATA_DIR = "scholarflow/data";

async function ensureDir() {
  try {
    await Filesystem.mkdir({ path: DATA_DIR, directory: Directory.Data, recursive: true });
  } catch {}
}

export async function mobileReadFile(fileName: string): Promise<string | null> {
  try {
    const result = await Filesystem.readFile({
      path: `${DATA_DIR}/${fileName}`,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
    return result.data as string;
  } catch {
    return null;
  }
}

export async function mobileWriteFile(fileName: string, content: string): Promise<void> {
  await ensureDir();
  await Filesystem.writeFile({
    path: `${DATA_DIR}/${fileName}`,
    data: content,
    directory: Directory.Data,
    encoding: Encoding.UTF8,
    recursive: true,
  });
}

// ── 统一接口 ──

/**
 * 获取当前登录用户的 schoolId 和 userId
 * 优先从 Zustand auth store 读取(兼容 Electron 加密存储)
 */
export function getCurrentUser(): { schoolId: string; userId: string | undefined } {
  const { schoolId, userId } = getCurrentAuth();
  return {
    schoolId: schoolId || "njtech",
    userId: userId || undefined,
  };
}

export async function readData(type: string): Promise<unknown> {
  if (isNative) {
    const fileName = `data/${type}.json`;
    const raw = await mobileReadFile(fileName);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  // Web/Electron: 赳 API — 带 schoolId/userId 实现账号隔离
  const { schoolId, userId } = getCurrentUser();
  const params = new URLSearchParams({ type, schoolId });
  if (userId) params.set("userId", userId);
  const res = await apiFetch(`/api/local-data?${params.toString()}`);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`读取失败 (${res.status}): ${text || res.statusText}`);
  }
  return await res.json();
}

export async function writeData(file: string, content: string, action = "更新"): Promise<void> {
  if (isNative) {
    await mobileWriteFile(file, content);
    return;
  }

  // Web/Electron: 走 API (带 git commit)
  const { schoolId, userId } = getCurrentUser();
  const body: Record<string, string> = { file, content, action, schoolId };
  if (userId) body.userId = userId;
  const res = await apiFetch("/api/local-save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`保存失败 (${res.status}): ${text || res.statusText}`);
  }
}
