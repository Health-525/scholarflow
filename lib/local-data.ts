/**
 * 本地数据工具 — 优先本地API，备用GitHub
 */
export async function fetchLocal<T>(type: string, fallback?: () => Promise<T>): Promise<T | null> {
  try {
    const res = await fetch(`/api/local-data?type=${type}`);
    if (res.ok) return await res.json();
  } catch {}
  if (fallback) return fallback();
  return null;
}
