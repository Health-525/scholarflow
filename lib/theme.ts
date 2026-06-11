export type ThemeValue = "light" | "dark" | "system";

const THEME_KEY = "sf_theme";

/**
 * 获取当前主题设置（从 localStorage）
 */
export function getTheme(): ThemeValue {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // ignore
  }
  return "system";
}

/**
 * 存储主题偏好
 */
export function setTheme(t: ThemeValue): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {
    // ignore
  }
}

/**
 * 获取实际生效的主题（解析 system 为 light/dark）
 */
export function getEffectiveTheme(theme?: ThemeValue): "light" | "dark" {
  const t = theme ?? getTheme();
  if (t === "light") return "light";
  if (t === "dark") return "dark";
  // system: read prefers-color-scheme
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

/**
 * 根据当前主题偏好和系统偏好，将 data-theme 写入 <html> 元素
 * 同时更新 Electron titleBarOverlay 颜色（跟随主题）
 *
 * Best practice: always set data-theme explicitly (light/dark),
 * never rely on @media alone — single source of truth via attribute.
 */
export function applyTheme(theme?: ThemeValue): void {
  if (typeof window === "undefined") return;
  const t = theme ?? getTheme();
  const html = document.documentElement;

  // Always set data-theme explicitly — resolves "system" to actual value
  const effective = getEffectiveTheme(t);
  html.setAttribute("data-theme", effective);

  // Update Electron titleBarOverlay to match theme
  if (typeof window !== 'undefined' && window.electronAPI?.setTitleBarOverlay) {
    window.electronAPI.setTitleBarOverlay(
      effective === 'dark'
        ? { color: '#1e1e22', symbolColor: '#e4e0d8', height: 36 }
        : { color: '#faf7f2', symbolColor: '#1a1510', height: 36 }
    );
  }
}

/**
 * Listen for system theme changes (for "system" mode auto-switching)
 * Returns a cleanup function to remove the listener.
 */
export function watchSystemTheme(onChange: (effective: "light" | "dark") => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = (e: MediaQueryListEvent) => {
    const current = getTheme();
    if (current === "system") {
      const effective = e.matches ? "dark" : "light";
      applyTheme("system");
      onChange(effective);
    }
  };
  mql.addEventListener("change", handler);
  return () => mql.removeEventListener("change", handler);
}
