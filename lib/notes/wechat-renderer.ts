import rehypeHighlight from "rehype-highlight";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

import { sanitizeHtml } from "@/lib/sanitize";

import calloutPlugin from "../markdown/callout-plugin";
import wikiLinkPlugin from "../markdown/wiki-link-plugin";

import { HIGHLIGHT_LANGUAGES } from "./highlight-languages";
import {
  codeBlockThemeUrl,
  generateWechatCss,
  type WechatStyleConfig,
} from "./wechat-themes";

const MAC_CODE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="45px" height="13px" viewBox="0 0 450 130">
  <ellipse cx="50" cy="65" rx="50" ry="52" stroke="rgb(220,60,54)" stroke-width="2" fill="rgb(237,108,96)" />
  <ellipse cx="225" cy="65" rx="50" ry="52" stroke="rgb(218,151,33)" stroke-width="2" fill="rgb(247,193,81)" />
  <ellipse cx="400" cy="65" rx="50" ry="52" stroke="rgb(27,161,37)" stroke-width="2" fill="rgb(100,200,86)" />
</svg>
`.trim();

export async function renderWechatMarkdown(markdown: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(calloutPlugin)
    .use(wikiLinkPlugin)
    .use(remarkRehype)
    .use(rehypeHighlight, { detect: true, languages: HIGHLIGHT_LANGUAGES })
    .use(rehypeStringify)
    .process(markdown);

  return await sanitizeHtml(String(result));
}

function wrapHeadings(html: string): string {
  if (typeof window === "undefined") return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const headings = Array.from(doc.querySelectorAll("h1, h2, h3, h4, h5, h6"));

  for (const h of headings) {
    const prefix = doc.createElement("span");
    prefix.className = "prefix";
    const content = doc.createElement("span");
    content.className = "content";
    content.innerHTML = h.innerHTML;
    const suffix = doc.createElement("span");
    suffix.className = "suffix";
    h.innerHTML = "";
    h.appendChild(prefix);
    h.appendChild(content);
    h.appendChild(suffix);
  }

  return doc.body.innerHTML;
}

function applyHeadingInlineStyles(html: string, config: WechatStyleConfig): string {
  if (typeof window === "undefined") return html;
  const headingStyles = config.headingStyles;
  const hasStyles = Object.values(headingStyles).some((s) => s && s !== "default");
  if (!hasStyles) return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const headings = Array.from(doc.querySelectorAll("h1, h2, h3, h4, h5, h6"));

  for (const h of headings) {
    const level = h.tagName.toLowerCase() as keyof typeof headingStyles;
    const style = headingStyles[level];
    if (!style || style === "default") continue;

    const primary = config.primaryColor;
    let inlineStyle = "";

    switch (style) {
      case "color-only":
        inlineStyle = `color: ${primary}`;
        break;
      case "border-bottom":
        inlineStyle = `padding-bottom: 0.3em; border-bottom: 2px solid ${primary}`;
        break;
      case "border-left":
        inlineStyle = `padding-left: 12px; border-left: 4px solid ${primary}`;
        break;
    }

    if (inlineStyle) {
      h.setAttribute("style", inlineStyle);
    }
  }

  return doc.body.innerHTML;
}

function postProcessCodeBlocks(
  html: string,
  options: { macCodeBlock: boolean; showLineNumber: boolean }
): string {
  if (typeof window === "undefined") return html;
  if (!options.macCodeBlock && !options.showLineNumber) return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const pres = Array.from(doc.querySelectorAll("pre"));

  for (const pre of pres) {
    const code = pre.querySelector("code");
    if (!code) continue;

    if (options.macCodeBlock) {
      const bar = doc.createElement("div");
      bar.className = "wechat-mac-bar";
      bar.innerHTML = MAC_CODE_SVG;
      pre.insertBefore(bar, code);
    }

    if (options.showLineNumber) {
      const rawHtml = code.innerHTML;
      const lines = rawHtml.split("\n");
      // drop trailing empty line created by final newline
      if (lines.length > 1 && lines[lines.length - 1].trim() === "") {
        lines.pop();
      }
      const wrapper = doc.createElement("span");
      wrapper.className = "wechat-code-wrapper";
      lines.forEach((line, idx) => {
        const lineEl = doc.createElement("div");
        lineEl.className = "wechat-code-line";
        const num = doc.createElement("span");
        num.className = "wechat-line-num";
        num.textContent = String(idx + 1);
        const content = doc.createElement("span");
        content.className = "wechat-line-code";
        content.innerHTML = line || "&nbsp;";
        lineEl.appendChild(num);
        lineEl.appendChild(content);
        wrapper.appendChild(lineEl);
      });
      code.innerHTML = "";
      code.appendChild(wrapper);
    }
  }

  return doc.body.innerHTML;
}

const CODE_THEME_CACHE = new Map<string, string>();

export async function fetchCodeBlockThemeCss(theme: string): Promise<string | null> {
  const cached = CODE_THEME_CACHE.get(theme);
  if (cached) return cached;
  try {
    const res = await fetch(codeBlockThemeUrl(theme));
    if (!res.ok) return null;
    const css = await res.text();
    CODE_THEME_CACHE.set(theme, css);
    return css;
  } catch {
    return null;
  }
}

interface RenderPreviewOptions {
  title: string;
  content: string;
  config: WechatStyleConfig;
  inlineCodeThemeCss?: string | null;
}

export async function renderWechatPreviewHtml(options: RenderPreviewOptions): Promise<string> {
  const { title, content, config, inlineCodeThemeCss } = options;
  const bodyHtml = await buildArticleHtml(content, config);
  const themeCss = generateWechatCss(config);
  const codeThemeLink = inlineCodeThemeCss
    ? `<style>${inlineCodeThemeCss}</style>`
    : `<link rel="stylesheet" href="${codeBlockThemeUrl(config.codeBlockTheme)}">`;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #f2f2f2;
      font-family: var(--md-font-family);
    }
    .wechat-wrapper {
      max-width: ${config.previewWidth === "mobile" ? "375px" : "720px"};
      margin: 0 auto;
      padding: 24px 16px;
    }
    .wechat-output {
      background: var(--md-bg-color);
      border-radius: 12px;
      padding: 32px 24px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
    }
  </style>
  <style>
${themeCss}
  </style>
  ${codeThemeLink}
</head>
<body>
  <div class="wechat-wrapper">
    <article class="wechat-output">
${bodyHtml}
    </article>
  </div>
</body>
</html>`;
}

async function buildArticleHtml(content: string, config: WechatStyleConfig): Promise<string> {
  let html = await renderWechatMarkdown(content);
  html = wrapHeadings(html);
  html = postProcessCodeBlocks(html, {
    macCodeBlock: config.macCodeBlock,
    showLineNumber: config.showLineNumber,
  });
  html = applyHeadingInlineStyles(html, config);
  return html;
}

export function countArticleStats(content: string): { chars: number; words: number; readingMinutes: number } {
  const text = content.replace(/[#*>`\-\s]+/g, " ").trim();
  const chars = text.replace(/\s/g, "").length;
  const words = text ? text.split(/\s+/).length : 0;
  // Chinese reading speed: ~400 chars/min; English: ~200 words/min
  const readingMinutes = Math.max(1, Math.ceil(Math.max(chars / 400, words / 200)));
  return { chars, words, readingMinutes };
}

/**
 * 将带 CSS 的 HTML 转为微信兼容的内联样式 HTML。
 * 微信编辑器会剥离 <style> 标签和 class 属性，
 * 只有内联 style="" 能保留样式。
 */
export async function inlineWechatStyles(html: string): Promise<string> {
  const TIMEOUT_MS = 8000;
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error("样式内联超时"));
    }, TIMEOUT_MS);

    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:720px;height:100px;border:0;";
    iframe.srcdoc = html;

    function cleanup() {
      clearTimeout(timeoutId);
      if (iframe.parentNode) document.body.removeChild(iframe);
    }

    iframe.onload = () => {
      try {
        const iframeDoc = iframe.contentDocument;
        const iframeWin = iframe.contentWindow;
        if (!iframeDoc || !iframeWin) {
          cleanup();
          resolve(html);
          return;
        }

        const article = iframeDoc.querySelector(".wechat-output");
        if (!article) {
          cleanup();
          resolve(html);
          return;
        }

        const elements = article.querySelectorAll("*");
        for (const el of elements) {
          const computed = iframeWin.getComputedStyle(el);
          const props: string[] = [];
          const relevant = [
            "color", "background-color", "font-size", "font-weight", "font-style",
            "font-family", "text-align", "line-height", "letter-spacing",
            "padding", "padding-left", "padding-right", "padding-top", "padding-bottom",
            "margin", "margin-left", "margin-right", "margin-top", "margin-bottom",
            "border", "border-left", "border-right", "border-top", "border-bottom",
            "border-radius", "border-color", "border-width", "border-style",
            "display", "white-space", "word-break", "text-decoration",
            "box-shadow", "text-shadow", "max-width", "width", "height",
            "overflow", "overflow-x", "overflow-y",
            "list-style", "list-style-type", "vertical-align",
            "border-collapse", "border-spacing", "text-indent",
            "min-width",
          ];

          for (const prop of relevant) {
            const value = computed.getPropertyValue(prop);
            if (value && value !== "initial" && value !== "normal" && value !== "auto"
              && value !== "0px" && value !== "rgba(0, 0, 0, 0)"
              && value !== "transparent" && value !== "none"
              && !value.startsWith("0s")) {
              props.push(`${prop}: ${value}`);
            }
          }
          if (props.length > 0) {
            (el as HTMLElement).setAttribute("style", props.join("; "));
          }
        }

        const hasLineNumbers = new Set<Element>();
        article.querySelectorAll("pre code").forEach((el) => {
          if (el.querySelector(".wechat-code-wrapper")) hasLineNumbers.add(el);
        });

        iframeDoc.querySelectorAll("style, link[rel=\"stylesheet\"]").forEach((t) => t.remove());
        article.querySelectorAll("[class]").forEach((el) => el.removeAttribute("class"));
        article.querySelectorAll("div").forEach((el) => {
          const section = iframeDoc.createElement("section");
          for (const attr of Array.from(el.attributes)) section.setAttribute(attr.name, attr.value);
          section.innerHTML = el.innerHTML;
          el.replaceWith(section);
        });
        article.querySelectorAll("pre code").forEach((el) => {
          if (hasLineNumbers.has(el)) return;
          el.innerHTML = el.innerHTML.replace(/\n/g, "<br>");
        });

        const result = "<!DOCTYPE html>\n" + iframeDoc.documentElement.outerHTML;
        cleanup();
        resolve(result);
      } catch (err) {
        cleanup();
        reject(err);
      }
    };
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
