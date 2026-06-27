import { renderMarkdown } from "@/lib/markdown/processor";

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
 * - 样式使用内敛风格，兼容公众号编辑器
 */
export async function exportWechatHtml(title: string, content: string) {
  let html = await renderMarkdown(content);
  html = await inlineImages(html);

  const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
      font-size: 16px;
      line-height: 1.75;
      color: #333;
      max-width: 680px;
      margin: 0 auto;
      padding: 24px;
    }
    h1 { font-size: 22px; font-weight: 600; margin: 24px 0 16px; line-height: 1.4; }
    h2 { font-size: 19px; font-weight: 600; margin: 22px 0 14px; line-height: 1.4; }
    h3 { font-size: 17px; font-weight: 600; margin: 20px 0 12px; line-height: 1.4; }
    p { margin: 14px 0; }
    img { max-width: 100%; height: auto; display: block; margin: 16px 0; border-radius: 4px; }
    ul, ol { margin: 14px 0; padding-left: 1.6em; }
    li { margin: 6px 0; }
    blockquote { margin: 14px 0; padding: 8px 16px; color: #555; border-left: 3px solid #ddd; background: #f8f8f8; }
    code { font-family: Menlo, Monaco, Consolas, monospace; font-size: 0.9em; background: #f2f2f2; padding: 2px 5px; border-radius: 3px; }
    pre { background: #f7f7f7; padding: 12px; border-radius: 4px; overflow-x: auto; }
    pre code { background: transparent; padding: 0; }
    a { color: #576b95; text-decoration: none; }
    hr { border: 0; border-top: 1px solid #eee; margin: 20px 0; }
  </style>
</head>
<body>
${html}
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
