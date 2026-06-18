/**
 * 移动端数据层 — 用 Capacitor Preferences/FileSystem 替代 Next.js API Routes
 *
 * 在 Electron 模式下走 /api/local-data 和 /api/local-save
 * 在 Capacitor 模式下直接用原生插件读写
 */

import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Preferences } from "@capacitor/preferences";

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
 * 从 localStorage 的 sf_auth 中读取
 */
export function getCurrentUser(): { schoolId: string; userId: string | undefined } {
  try {
    const raw = localStorage.getItem("sf_auth");
    if (raw) {
      const parsed = JSON.parse(raw);
      const state = parsed?.state || parsed;
      const userId = state?.userId || state?.username;
      return {
        schoolId: state?.schoolId || "njtech",
        userId: userId?.trim() ? userId.trim() : undefined,
      };
    }
  } catch {}
  return { schoolId: "njtech", userId: undefined };
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
  try {
    const res = await fetch(`/api/local-data?${params.toString()}`);
    if (res.ok) return await res.json();
  } catch (e) { console.error("[MobileData] readData fetch failed:", e); }
  return null;
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
  await fetch("/api/local-save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ── 设置存储 (key-value) ──

export async function getSetting(key: string): Promise<string | null> {
  if (isNative) {
    const { value } = await Preferences.get({ key });
    return value;
  }
  return localStorage.getItem(key);
}

export async function setSetting(key: string, value: string): Promise<void> {
  if (isNative) {
    await Preferences.set({ key, value });
    return;
  }
  localStorage.setItem(key, value);
}

export async function removeSetting(key: string): Promise<void> {
  if (isNative) {
    await Preferences.remove({ key });
    return;
  }
  localStorage.removeItem(key);
}
