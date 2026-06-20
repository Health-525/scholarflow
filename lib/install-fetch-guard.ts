import { INTERNAL_TOKEN_HEADER } from "./auth/origin";
import { isElectron } from "./runtime-env";

let cachedToken: string | null = null;
let tokenPromise: Promise<string | null> | null = null;

async function resolveToken(): Promise<string | null> {
  if (cachedToken !== null) return cachedToken;
  if (!isElectron() || !window.electronAPI?.getInternalToken) return null;
  if (!tokenPromise) {
    tokenPromise = window.electronAPI.getInternalToken().then((t) => {
      cachedToken = t;
      tokenPromise = null;
      return t;
    });
  }
  return tokenPromise;
}

const originalFetch = globalThis.fetch;

function isApiUrl(url: string | URL | Request): boolean {
  const s = typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
  return s.startsWith("/api/") || s.includes("/api/");
}

/**
 * Wrap global fetch to automatically attach the internal token for /api/ requests in Electron.
 * This ensures all API calls pass the isTrustedOrigin check without modifying each call site.
 */
export function installApiFetchGuard(): void {
  if (typeof window === "undefined") return;
  if (!isElectron()) return;

  globalThis.fetch = async function patchedFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
    if (!isApiUrl(input)) return originalFetch.call(globalThis, input, init);

    const token = await resolveToken();
    if (!token) return originalFetch.call(globalThis, input, init);

    const headers = new Headers(init?.headers);
    if (!headers.has(INTERNAL_TOKEN_HEADER)) {
      headers.set(INTERNAL_TOKEN_HEADER, token);
    }
    return originalFetch.call(globalThis, input, { ...init, headers });
  };
}
