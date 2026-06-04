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
 */
export function applyTheme(theme?: ThemeValue): void {
  if (typeof window === "undefined") return;
  const t = theme ?? getTheme();
  const html = document.documentElement;

  if (t === "system") {
    html.removeAttribute("data-theme");
  } else {
    html.setAttribute("data-theme", t);
  }
}
