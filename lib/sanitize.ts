import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "br", "hr",
  "strong", "em", "del", "code", "pre",
  "ul", "ol", "li",
  "blockquote",
  "table", "thead", "tbody", "tr", "th", "td",
  "a",
  "img",
  "span", "div",
];

const ALLOWED_ATTR = [
  "href", "src", "alt", "title", "class", "id",
  "data-callout-type",
  "aria-hidden", "role",
  "loading", "decoding",
];

const DOMPURIFY_CONFIG = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input"],
  FORBID_ATTR: ["style"],
  ALLOW_DATA_ATTR: false,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
};

/**
 * 服务端 DOMPurify 实例（懒加载）
 */
let serverDOMPurify: typeof DOMPurify | null = null;

async function getServerDOMPurify(): Promise<typeof DOMPurify | null> {
  if (serverDOMPurify) return serverDOMPurify;
  try {
    // 使用动态 import 加载 jsdom，并显式忽略 webpack，避免被打包到客户端。
    // next.config.js 已将 jsdom 标记为 serverExternalPackages。
    const { JSDOM } = await import(/* webpackIgnore: true */ "jsdom");
    const window = new JSDOM("").window;
    serverDOMPurify = DOMPurify(window as unknown as Window & typeof globalThis);
    // 添加 javascript: URL 拦截 hook
    serverDOMPurify.addHook("afterSanitizeAttributes", (node: Element) => {
      if (node.tagName === "A") {
        const href = node.getAttribute("href") || "";
        if (/^javascript:/i.test(href.trim())) {
          node.removeAttribute("href");
        }
      }
      if (node.tagName === "IMG") {
        const src = node.getAttribute("src") || "";
        if (/^javascript:/i.test(src.trim())) {
          node.removeAttribute("src");
        }
      }
    });
    return serverDOMPurify;
  } catch {
    // jsdom 不可用时回退到正则清理
    return null;
  }
}

function escapeHtmlToText(html: string): string {
  return html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * 净化 HTML 字符串，防止 XSS 攻击
 * 白名单模式：只允许安全标签和属性
 */
export async function sanitizeHtml(html: string): Promise<string> {
  if (typeof window === "undefined") {
    // Server-side: 必须使用 jsdom + DOMPurify；不可用时不回退到正则，
    // 因为正则无法可靠防御 XSS（如 SVG payload、编码变形、script src 等）。
    const purify = await getServerDOMPurify();
    if (purify) {
      return purify.sanitize(html, DOMPURIFY_CONFIG) as string;
    }
    // 安全兜底：将 HTML 转义为纯文本，避免任何标签/事件执行。
    return escapeHtmlToText(html);
  }

  // Client-side: 使用浏览器原生 DOMPurify
  const sanitized = DOMPurify.sanitize(html, DOMPURIFY_CONFIG);

  // 添加 javascript: URL 拦截 hook（仅首次）
  if (!("__scholarflow_hook_added" in DOMPurify)) {
    DOMPurify.addHook("afterSanitizeAttributes", (node) => {
      if (node.tagName === "A") {
        const href = node.getAttribute("href") || "";
        if (/^javascript:/i.test(href.trim())) {
          node.removeAttribute("href");
        }
      }
      if (node.tagName === "IMG") {
        const src = node.getAttribute("src") || "";
        if (/^javascript:/i.test(src.trim())) {
          node.removeAttribute("src");
        }
      }
    });
    (DOMPurify as unknown as Record<string, unknown>).__scholarflow_hook_added = true;
  }

  return sanitized;
}
