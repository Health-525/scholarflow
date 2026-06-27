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
  let bodyHtml = await renderWechatMarkdown(content);
  bodyHtml = postProcessCodeBlocks(bodyHtml, {
    macCodeBlock: config.macCodeBlock,
    showLineNumber: config.showLineNumber,
  });

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
      max-width: 720px;
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
  ${codeThemeLink}
  <style>
${themeCss}
  </style>
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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
