import fs from "fs";
import path from "path";

import { resolveDataDir } from "@/lib/server-db/path";

export const INTERNAL_TOKEN_HEADER = "x-scholarflow-internal-token";

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3456",
  "https://localhost:3456",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3456",
];

/**
 * 校验请求是否来自受信任的来源。
 *
 * 浏览器请求：必须带有 Origin 头，且匹配白名单（或显式 CORS_ORIGIN=*）。
 * 非浏览器内部请求（如 Electron 主进程调用）：必须携带与进程环境变量一致的
 * `SCHOLARFLOW_INTERNAL_TOKEN`，否则拒绝。缺失 Origin 不再默认可信。
 */
export function isTrustedOrigin(
  request: Request,
  options: { allowInternalToken?: boolean } = {}
): boolean {
  const origin = request.headers.get("origin");

  if (origin) {
    const configured = process.env.CORS_ORIGIN;
    if (configured === "*") return true; // 显式 CORS_ORIGIN=* 时放行
    const allowed = configured
      ? configured.split(",").map((s) => s.trim()).filter(Boolean)
      : DEFAULT_ALLOWED_ORIGINS;
    return allowed.includes(origin);
  }

  // 非浏览器请求：若调用方声明允许内部 token，则校验 token
  if (options.allowInternalToken) {
    return hasValidInternalToken(request);
  }

  return false;
}

function readInternalTokenFromFile(): string | null {
  // 仅在服务端运行时可用；热重载开发态下 next dev 与 Electron 主进程共享 data/.internal-token
  if (typeof window !== "undefined") return null;
  try {
    const tokenPath = path.join(resolveDataDir(), ".internal-token");
    if (fs.existsSync(tokenPath)) {
      return fs.readFileSync(tokenPath, "utf-8").trim() || null;
    }
  } catch {
    // 忽略读取失败，回退到环境变量
  }
  return null;
}

export function hasValidInternalToken(request: Request): boolean {
  const token = request.headers.get(INTERNAL_TOKEN_HEADER);
  const expected = process.env.SCHOLARFLOW_INTERNAL_TOKEN || readInternalTokenFromFile();
  // 生产环境和开发环境都必须配置有效的内部 token；未配置时一律拒绝。
  // Electron 主进程启动时会自动生成并注入该 token，正常启动不会为空。
  return !!expected && !!token && token === expected;
}

/** 返回统一的 403 响应 */
export function forbiddenResponse(body: Record<string, unknown> = { error: "forbidden" }) {
  return new Response(JSON.stringify(body), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}
