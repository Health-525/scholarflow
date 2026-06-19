const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3456",
  "https://localhost:3456",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3456",
];

/**
 * 校验请求是否来自受信任的 Origin。
 * - 如果请求没有 Origin（如同一进程/Electron 主进程内部调用），视为可信。
 * - 如果配置了 CORS_ORIGIN，则必须匹配；通配符 "*" 仅在显式配置时允许任意来源。
 */
export function isTrustedOrigin(request: Request): boolean {
  const configured = process.env.CORS_ORIGIN;
  const allowed = configured
    ? configured.split(",").map((s) => s.trim()).filter(Boolean)
    : DEFAULT_ALLOWED_ORIGINS;
  const origin = request.headers.get("origin");
  if (!origin) return true; // 服务器内部调用（如 Electron 主进程）
  if (allowed.length === 0) return true; // 显式 CORS_ORIGIN=* 时放行
  return allowed.includes(origin);
}
