const TOKEN_KEY = "sf_token";

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "insufficient_permissions" | "network_unreachable" };

/**
 * 校验 Token 格式（仅本地，不发起网络请求）
 * Token 以 ghp_ 或 github_pat_ 开头且总长度 ≥ 10
 */
export function validateTokenFormat(token: string): boolean {
  if (typeof token !== "string") return false;
  if (token.length < 10) return false;
  return token.startsWith("ghp_") || token.startsWith("github_pat_");
}

/**
 * 从 localStorage 读取已存储的 Token
 */
export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * 将 Token 写入 localStorage
 */
export function storeToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

/**
 * 删除 localStorage 中的 Token
 */
export function clearToken(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

/**
 * 向 GitHub API 发起验证请求（10 秒超时）
 */
export async function verifyToken(token: string): Promise<VerifyResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const resp = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (resp.ok) {
      return { ok: true };
    }

    if (resp.status === 401) {
      return { ok: false, reason: "invalid" };
    }

    if (resp.status === 403) {
      return { ok: false, reason: "insufficient_permissions" };
    }

    return { ok: false, reason: "invalid" };
  } catch (err) {
    clearTimeout(timeoutId);
    const isAbort =
      err instanceof Error && (err.name === "AbortError" || err.message.includes("aborted"));
    if (isAbort) {
      return { ok: false, reason: "network_unreachable" };
    }
    return { ok: false, reason: "network_unreachable" };
  }
}
