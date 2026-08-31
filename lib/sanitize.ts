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
 * javascript: 协议拦截：a[href] 与 img[src] 都要清。
 * 服务端与客户端共用同一份规则——此前两边各写一遍，改一边漏一边的风险很实在。
 */
function stripJavascriptUrls(node: Element): void {
  if (node.tagName === "A") {
    const href = node.getAttribute("href") || "";
    if (/^javascript:/i.test(href.trim())) node.removeAttribute("href");
  }
  if (node.tagName === "IMG") {
    const src = node.getAttribute("src") || "";
    if (/^javascript:/i.test(src.trim())) node.removeAttribute("src");
  }
}

const HOOK_FLAG = "__scholarflow_hook_added";

/**
 * 幂等注册 hook。**必须在 sanitize 之前调用。**
 * 客户端分支原先是先 sanitize 再 addHook，导致首次调用时拦截 hook 尚未挂上。
 */
function ensureHooks(instance: typeof DOMPurify): void {
  if (HOOK_FLAG in instance) return;
  instance.addHook("afterSanitizeAttributes", stripJavascriptUrls);
  (instance as unknown as Record<string, unknown>)[HOOK_FLAG] = true;
}

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
    ensureHooks(serverDOMPurify);
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
 * 浏览器端同步净化。**只能在客户端调用**（"use client" 组件、事件回调等）。
 *
 * sanitizeHtml 之所以是 async，仅因服务端要动态 import jsdom；浏览器分支本身同步。
 * 客户端组件若在 JSX 里直接调 async 版，会把 Promise 交给 dangerouslySetInnerHTML，
 * 结果渲染出 "[object Promise]"、净化根本没执行——所以这里给出显式的同步入口。
 */
export function sanitizeHtmlSync(html: string): string {
  if (typeof window === "undefined") {
    throw new Error(
      "sanitizeHtmlSync 仅限浏览器端；服务端请用 await sanitizeHtml()",
    );
  }
  ensureHooks(DOMPurify);
  return DOMPurify.sanitize(html, DOMPURIFY_CONFIG);
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

  // Client-side: 走同一条同步实现，hook 注册与净化的顺序由 sanitizeHtmlSync 保证
  return sanitizeHtmlSync(html);
}
