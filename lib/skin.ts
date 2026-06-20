export type SkinValue = "ximi" | "blue";

const SKIN_KEY = "sf_skin";

/** 读取当前配色(localStorage),默认粉色小咪 */
export function getSkin(): SkinValue {
  if (typeof window === "undefined") return "ximi";
  try {
    const s = localStorage.getItem(SKIN_KEY);
    if (s === "blue" || s === "ximi") return s;
  } catch {
    // ignore
  }
  return "ximi";
}

/** 存储配色偏好 */
export function setSkin(s: SkinValue): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SKIN_KEY, s);
  } catch {
    // ignore
  }
}

/** 获取当前主题(考虑系统偏好) */
function getEffectiveTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  const t = localStorage.getItem("sf_theme");
  if (t === "dark") return "dark";
  if (t === "light") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** 更新 <html> 背景色 */
function updateBackgroundColor(skin: SkinValue, theme: "light" | "dark"): void {
  const isMobile = window.matchMedia("(max-width: 767px)").matches;
  if (isMobile) {
    document.documentElement.style.backgroundColor = skin === "blue" ? "#f2faf8" : "#fef8fa";
  } else if (theme === "dark") {
    document.documentElement.style.backgroundColor = "#171717";
  } else {
    document.documentElement.style.backgroundColor = "#f7f7f5";
  }
}

/**
 * 把 data-skin 写到 <html>,并更新背景色。
 * 蓝色皮肤仅在移动端 @media(max-width:767px) 下生效,桌面端无影响。
 */
export function applySkin(s?: SkinValue): void {
  if (typeof window === "undefined") return;
  const skin = s ?? getSkin();
  document.documentElement.setAttribute("data-skin", skin);
  updateBackgroundColor(skin, getEffectiveTheme());
}
