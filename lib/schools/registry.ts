/**
 * School Registry — 学校适配器注册表
 *
 * 管理所有已注册的学校适配器。
 * 新增学校只需: import { registerSchool } from "@/lib/schools/registry";
 *               registerSchool(myAdapter);
 */

import { njtechAdapter } from "./njtech";
import type { SchoolAdapter } from "./types";

const ADAPTERS: Map<string, SchoolAdapter> = new Map();

/**
 * 注册学校适配器
 */
export function registerSchool(adapter: SchoolAdapter): void {
  ADAPTERS.set(adapter.id, adapter);
}

/**
 * 获取指定学校的适配器
 */
export function getAdapter(schoolId: string): SchoolAdapter | undefined {
  return ADAPTERS.get(schoolId);
}

/**
 * 获取所有已注册的学校列表
 */
export function getAllSchools(): SchoolAdapter[] {
  return [...ADAPTERS.values()];
}

// ── 注册已知学校 ────────────────────────────────────────────
registerSchool(njtechAdapter);
