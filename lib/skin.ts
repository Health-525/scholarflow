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

/**
 * 把 data-skin 写到 <html>。
 * 蓝色皮肤仅在移动端 @media(max-width:767px) 下生效,桌面端无影响。
 */
export function applySkin(s?: SkinValue): void {
  if (typeof window === "undefined") return;
  document.documentElement.setAttribute("data-skin", s ?? getSkin());
}
