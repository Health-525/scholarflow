import { countArticleStats, fetchCodeBlockThemeCss, inlineWechatStyles, renderWechatPreviewHtml } from "./wechat-renderer";
import {
  codeBlockThemeUrl,
  defaultWechatStyleConfig,
  type WechatStyleConfig,
} from "./wechat-themes";

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
 * - 代码块高亮主题 CSS 会内联到 HTML 中
 */
export async function exportWechatHtml(
  title: string,
  content: string,
  config: WechatStyleConfig = defaultWechatStyleConfig()
) {
  let codeThemeCss = await fetchCodeBlockThemeCss(config.codeBlockTheme);
  if (!codeThemeCss) {
    codeThemeCss = `/* 代码块主题加载失败，原链接：${codeBlockThemeUrl(config.codeBlockTheme)} */`;
  }

  let html = await renderWechatPreviewHtml({
    title,
    content,
    config,
    inlineCodeThemeCss: codeThemeCss,
  });
  html = await inlineImages(html);
  // 将 CSS 转为内联样式，确保微信编辑器不丢失样式
  html = await inlineWechatStyles(html);

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  triggerDownload(blob, `${sanitizeFilename(title)}.html`);
}

export function getWechatExportStats(content: string) {
  return countArticleStats(content);
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

  return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
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
