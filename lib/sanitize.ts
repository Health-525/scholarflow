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

/**
 * 净化 HTML 字符串，防止 XSS 攻击
 * 白名单模式：只允许安全标签和属性
 */
export function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") {
    // Server-side: basic strip (DOMPurify requires DOM)
    return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/\son\w+\s*=/gi, " data-removed=")
      .replace(/javascript:/gi, "blocked:");
  }

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input"],
    FORBID_ATTR: ["style"],
    // Allow safe protocols
    ALLOW_DATA_ATTR: false,
    // Hook to block javascript: in hrefs
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
  });
}

/**
 * DOMPurify hook to block javascript: URLs
 */
if (typeof window !== "undefined") {
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
}
