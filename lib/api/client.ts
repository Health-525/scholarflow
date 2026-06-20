/**
 * 统一 API 客户端
 *
 * 封装了所有页面共用的：
 * - accountParams：把 schoolId/userId 附加到请求参数
 * - checkOk：统一检查 HTTP 响应状态
 * - apiGet/apiPost/apiPatch/apiDelete：带账号参数的 CRUD 封装
 */

// ── 账号参数 ──────────────────────────────────────────────────

export function accountParams(
  schoolId: string | null,
  userId: string | null
): string {
  const p = new URLSearchParams();
  if (schoolId) p.set("schoolId", schoolId);
  if (userId) p.set("userId", userId);
  return p.toString();
}

// ── 响应检查 ─────────────────────────────────────────────────

export async function checkOk(res: Response): Promise<void> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`请求失败 (${res.status}): ${text || res.statusText}`);
  }
}

// ── 通用请求封装 ─────────────────────────────────────────────

export async function apiGet<T = unknown>(
  path: string,
  schoolId: string | null,
  userId: string | null
): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  const qs = accountParams(schoolId, userId);
  const res = await fetch(qs ? `${path}${sep}${qs}` : path);
  await checkOk(res);
  return res.json() as Promise<T>;
}

export async function apiPost<T = unknown>(
  path: string,
  body: unknown
): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await checkOk(res);
  return res.json() as Promise<T>;
}

export async function apiPatch<T = unknown>(
  path: string,
  body: unknown
): Promise<T> {
  const res = await fetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await checkOk(res);
  return res.json() as Promise<T>;
}

export async function apiDelete(
  path: string,
  schoolId: string | null,
  userId: string | null
): Promise<void> {
  const sep = path.includes("?") ? "&" : "?";
  const qs = accountParams(schoolId, userId);
  const res = await fetch(qs ? `${path}${sep}${qs}` : path, {
    method: "DELETE",
  });
  await checkOk(res);
}
