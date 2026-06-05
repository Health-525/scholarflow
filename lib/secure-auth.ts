/**
 * Secure Auth: Token 安全存储抽象
 *
 * - Electron 环境：通过 IPC → main process safeStorage（DPAPI/Keychain）
 * - Web/PWA 环境：localStorage + 简单混淆（非加密，仅防明文泄露）
 */

const TOKEN_KEY = "sf_secure_token";

// 检测是否在 Electron 环境中
export function isElectron(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as { electronAPI?: { isElectron?: boolean } };
  return w.electronAPI?.isElectron === true;
}

// 获取 Electron API（类型安全）
function getElectronAPI() {
  const w = window as {
    electronAPI?: {
      encryptAndStoreToken: (token: string) => Promise<boolean>;
      retrieveToken: () => Promise<string | null>;
      clearToken: () => Promise<boolean>;
    };
  };
  return w.electronAPI;
}

/**
 * 安全存储 Token
 * Electron: 通过 IPC 加密到系统密钥链
 * Web: localStorage + base64 混淆
 */
export async function secureStoreToken(token: string): Promise<void> {
  if (isElectron()) {
    const api = getElectronAPI();
    if (api) {
      await api.encryptAndStoreToken(token);
      return;
    }
  }
  // Web fallback: base64 混淆（非安全存储）
  if (typeof window !== "undefined") {
    try {
      const encoded = btoa(token);
      localStorage.setItem(TOKEN_KEY, encoded);
    } catch {
      // ignore
    }
  }
}

/**
 * 检索已存储的 Token
 */
export async function secureRetrieveToken(): Promise<string | null> {
  if (isElectron()) {
    const api = getElectronAPI();
    if (api) {
      return await api.retrieveToken();
    }
  }
  // Web fallback
  if (typeof window !== "undefined") {
    try {
      const encoded = localStorage.getItem(TOKEN_KEY);
      if (encoded) return atob(encoded);
    } catch {
      // ignore
    }
  }
  return null;
}

/**
 * 清除已存储的 Token
 */
export async function secureClearToken(): Promise<void> {
  if (isElectron()) {
    const api = getElectronAPI();
    if (api) {
      await api.clearToken();
      return;
    }
  }
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // ignore
    }
  }
}

// ── 兼容旧版 localStorage Token（自动迁移） ──
const LEGACY_TOKEN_KEY = "sf_auth";

export async function migrateLegacyToken(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const stored = localStorage.getItem(LEGACY_TOKEN_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const legacyToken = parsed?.state?.token;
      if (legacyToken) {
        await secureStoreToken(legacyToken);
        // 不清除旧 Token——保留兼容
        return true;
      }
    }
  } catch {
    // ignore
  }
  return false;
}
