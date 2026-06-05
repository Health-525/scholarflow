/**
 * ScholarFlow 离线数据库 (Dexie.js + IndexedDB)
 *
 * 作为离线优先架构的本地缓存层：
 * - 在线时：TanStack Query 从 GitHub API 获取数据，同步写入 IndexedDB
 * - 离线时：从 IndexedDB 读取缓存数据，提供完整脱机体验
 */

import Dexie, { type Table } from "dexie";
import type { Assignment, RunRecord } from "@/types";

export interface CachedFile {
  id?: number;
  repo: string; // "content" | "execution"
  path: string; // GitHub 路径
  content: string; // 文件内容（已解码的文本）
  sha: string; // GitHub SHA
  updatedAt: number; // 缓存时间戳 (ms)
}

export interface MutationsQueue {
  id?: number;
  repo: string;
  path: string;
  content: string;
  action: string; // 变更描述
  createdAt: number; // 创建时间戳 (ms)
  synced: number; // 0 = 未同步, 1 = 已同步 (Dexie 索引不支持 boolean)
}

export interface AppSettings {
  key: string;
  value: unknown;
}

class ScholarFlowDB extends Dexie {
  cachedFiles!: Table<CachedFile, number>;
  mutationsQueue!: Table<MutationsQueue, number>;
  appSettings!: Table<AppSettings, string>;

  constructor() {
    super("ScholarFlowDB");

    this.version(1).stores({
      cachedFiles: "++id, [repo+path], updatedAt",
      mutationsQueue: "++id, synced, createdAt",
      appSettings: "key",
    });
  }

  /**
   * 缓存 GitHub 文件内容到本地
   */
  async cacheFile(
    repo: string,
    path: string,
    content: string,
    sha: string
  ): Promise<void> {
    await this.cachedFiles.put({
      repo,
      path,
      content,
      sha,
      updatedAt: Date.now(),
    });
  }

  /**
   * 从本地缓存读取文件
   */
  async getCachedFile(
    repo: string,
    path: string
  ): Promise<CachedFile | undefined> {
    return this.cachedFiles
      .where({ repo, path })
      .first();
  }

  /**
   * 清理过期的缓存文件（超过 maxAgeMs）
   */
  async cleanExpiredCache(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    const cutoff = Date.now() - maxAgeMs;
    const oldFiles = await this.cachedFiles
      .where("updatedAt")
      .below(cutoff)
      .toArray();
    const ids = oldFiles.map((f) => f.id!).filter(Boolean);
    await this.cachedFiles.bulkDelete(ids);
    return ids.length;
  }

  /**
   * 添加待同步的变更
   */
  async queueMutation(
    repo: string,
    path: string,
    content: string,
    action: string
  ): Promise<number> {
    return this.mutationsQueue.add({
      repo,
      path,
      content,
      action,
      createdAt: Date.now(),
      synced: 0,
    });
  }

  /**
   * 获取所有未同步的变更
   */
  async getPendingMutations(): Promise<MutationsQueue[]> {
    return this.mutationsQueue
      .where("synced")
      .equals(0)
      .sortBy("createdAt");
  }

  /**
   * 标记变更为已同步
   */
  async markMutationSynced(id: number): Promise<void> {
    await this.mutationsQueue.where("id").equals(id).modify({ synced: 1 });
  }
}

// 单例
let dbInstance: ScholarFlowDB | null = null;

export function getDB(): ScholarFlowDB {
  if (!dbInstance) {
    dbInstance = new ScholarFlowDB();
  }
  return dbInstance;
}

export { ScholarFlowDB };
