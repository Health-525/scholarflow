import { INTERNAL_TOKEN_HEADER } from "./auth/origin";

let cachedInternalToken: string | null = null;
let tokenFetchPromise: Promise<string | null> | null = null;

async function getInternalToken(): Promise<string | null> {
  if (cachedInternalToken !== null) return cachedInternalToken;
  if (typeof window === "undefined" || !window.electronAPI?.getInternalToken) return null;
  if (!tokenFetchPromise) {
    tokenFetchPromise = window.electronAPI.getInternalToken().then((t) => {
      cachedInternalToken = t;
      tokenFetchPromise = null;
      return t;
    });
  }
  return tokenFetchPromise;
}

export async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = await getInternalToken();
  if (!token) return fetch(url, init);

  const headers = new Headers(init?.headers);
  if (!headers.has(INTERNAL_TOKEN_HEADER)) {
    headers.set(INTERNAL_TOKEN_HEADER, token);
  }
  return fetch(url, { ...init, headers });
}
