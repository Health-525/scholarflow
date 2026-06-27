import { renderMarkdown } from "@/lib/markdown/processor";

import { getWechatThemeCss } from "./wechat-themes";

export { WECHAT_THEMES, type WechatTheme } from "./wechat-themes";

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "-").trim() || "笔记";
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportMarkdown(title: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  triggerDownload(blob, `${sanitizeFilename(title)}.md`);
}

/**
 * 将笔记导出为适合复制到微信公众号后台的 HTML。
 * - 图片会尝试内联为 base64，避免本地 URL 失效
 * - 支持多种主题（默认、浅蓝、暗夜、暖橙）
 */
export async function exportWechatHtml(title: string, content: string, themeId: string = "default") {
  let html = await renderMarkdown(content);
  html = await inlineImages(html);

  const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
${getWechatThemeCss(themeId)}
  </style>
</head>
<body>
  <div class="wrapper">
    <article class="article">
${html}
    </article>
  </div>
</body>
</html>`;

  const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
  triggerDownload(blob, `${sanitizeFilename(title)}.html`);
}

async function inlineImages(html: string): Promise<string> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const images = Array.from(doc.querySelectorAll("img"));

  await Promise.all(
    images.map(async (img) => {
      const src = img.getAttribute("src");
      if (!src) return;
      try {
        const absolute = new URL(src, window.location.href).href;
        if (absolute.startsWith("data:")) return;
        const res = await fetch(absolute);
        if (!res.ok) return;
        const blob = await res.blob();
        const dataUrl = await blobToDataUrl(blob);
        img.setAttribute("src", dataUrl);
      } catch {
        // 忽略无法内联的图片，保留原 URL
      }
    })
  );

  return doc.body.innerHTML;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
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

export function parseMarkdownFile(file: File): Promise<{ title: string; content: string }> {
  return new Promise((resolve, reject) => {
    if (!file.name.toLowerCase().endsWith(".md")) {
      reject(new Error("请选择 Markdown (.md) 文件"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result ?? "");
      const title = file.name.replace(/\.md$/i, "").replace(/[-_]/g, " ");
      resolve({ title, content });
    };
    reader.onerror = () => reject(new Error("读取文件失败"));
    reader.readAsText(file);
  });
}
