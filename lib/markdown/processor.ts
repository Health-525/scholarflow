import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import calloutPlugin from "./callout-plugin";
import wikiLinkPlugin from "./wiki-link-plugin";
import { sanitizeHtml } from "@/lib/sanitize";

export interface MarkdownOptions {
  noteDir?: string;
  noteName?: string;
}

/**
 * 预处理：将 Obsidian 的 ![[图片名.png]] 直接替换为 <img> 标签
 * 支持所有 Obsidian 图片命名格式：
 *   - file-20260525094550354.png   (PPT导出)
 *   - Pasted image 20260330094106.png  (剪贴板粘贴)
 *   - 截图.png, photo.jpg 等任意名称
 */
function preprocessObsidianImages(markdown: string, options?: MarkdownOptions): string {
  if (!options?.noteDir || !options?.noteName) return markdown;

  const baseUrl = `https://raw.githubusercontent.com/Health-525/jiangshu-study/main/${options.noteDir}/assets/${options.noteName}`;

  return markdown.replace(
    /!\[\[([^\]]+\.(?:png|jpg|jpeg|gif|webp|svg|bmp|ico))(?:\|([^\]]*))?\]\]/gi,
    (_full, filename, _alt) => {
      const encoded = filename.trim().split("/").map(encodeURIComponent).join("/");
      const url = `${baseUrl}/${encoded}`;
      return `<img src="${url}" loading="lazy" class="markdown-image" alt="${filename}" />`;
    }
  );
}

/**
 * 渲染 Markdown 为安全 HTML
 * 管线：预处理Obsidian图片 → remark-parse → remark-gfm → callout → wikilink → remark-rehype → rehype-stringify → DOMPurify
 */
export async function renderMarkdown(markdown: string, options?: MarkdownOptions): Promise<string> {
  // 第一步：预处理 Obsidian 图片嵌入
  const processed = preprocessObsidianImages(markdown, options);

  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(calloutPlugin)
    .use(wikiLinkPlugin)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(processed);

  const rawHtml = String(result);
  return sanitizeHtml(rawHtml);
}
