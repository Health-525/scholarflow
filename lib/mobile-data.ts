/**
 * 移动端数据层 — 用 Capacitor Preferences/FileSystem 替代 Next.js API Routes
 *
 * 在 Electron 模式下走 /api/local-data 和 /api/local-save
 * 在 Capacitor 模式下直接用原生插件读写
 */

import { Preferences } from "@capacitor/preferences";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";

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

export async function readData(type: string): Promise<unknown> {
  if (isNative) {
    const fileName = `data/${type}.json`;
    const raw = await mobileReadFile(fileName);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  // Web/Electron: 走 API
  try {
    const res = await fetch(`/api/local-data?type=${type}`);
    if (res.ok) return await res.json();
  } catch {}
  return null;
}

export async function writeData(file: string, content: string, action = "更新"): Promise<void> {
  if (isNative) {
    await mobileWriteFile(file, content);
    return;
  }

  // Web/Electron: 走 API (带 git commit)
  await fetch("/api/local-save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file, content, action }),
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
