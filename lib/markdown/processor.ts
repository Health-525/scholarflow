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
 * 构建图片资源基础URL
 */
function getBaseUrl(options?: MarkdownOptions): string | null {
  if (!options?.noteDir || !options?.noteName) return null;
  return `https://raw.githubusercontent.com/Health-525/jiangshu-study/main/${options.noteDir}/assets/${options.noteName}`;
}

/**
 * 后处理：将 HTML 中所有相对路径的 <img> src 重写为 GitHub 绝对 URL
 * 作为安全兜底——即使 preprocessor 漏掉了某些图片，这里也会重写
 */
function rewriteImageSrc(html: string, baseUrl: string): string {
  return html.replace(
    /<img\s+([^>]*?)src="([^"]+\.(?:png|jpg|jpeg|gif|webp|svg|bmp|ico))"([^>]*?)>/gi,
    (match, before, filename, after) => {
      // 跳过已经是绝对 URL 的
      if (/^https?:\/\//i.test(filename)) return match;
      const encoded = filename.trim().split("/").map(encodeURIComponent).join("/");
      return `<img ${before}src="${baseUrl}/${encoded}"${after} loading="lazy" class="markdown-image">`;
    }
  );
}

/**
 * 预处理：将 Obsidian 的 ![[图片名.png]] 直接替换为 <img> 标签
 */
function preprocessObsidianImages(markdown: string, baseUrl: string): string {
  return markdown.replace(
    /!\[\[([^\]]+\.(?:png|jpg|jpeg|gif|webp|svg|bmp|ico))(?:\|([^\]]*))?\]\]/gi,
    (_full, filename, _alt) => {
      const encoded = filename.trim().split("/").map(encodeURIComponent).join("/");
      return `<img src="${baseUrl}/${encoded}" loading="lazy" class="markdown-image" alt="${filename}" />`;
    }
  );
}

/**
 * 渲染 Markdown 为安全 HTML
 * 三层图片处理：
 *   1) 预处理：![[图片]] → <img src=完整URL>  (原始Markdown层面)
 *   2) unified管线：标准Markdown处理
 *   3) 后处理：兜底重写所有相对路径img的src (HTML层面)
 */
export async function renderMarkdown(markdown: string, options?: MarkdownOptions): Promise<string> {
  const baseUrl = getBaseUrl(options);

  // 预处理
  const processed = baseUrl
    ? preprocessObsidianImages(markdown, baseUrl)
    : markdown;

  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(calloutPlugin)
    .use(wikiLinkPlugin)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(processed);

  let html = sanitizeHtml(String(result));

  // 后处理兜底：重写任何剩余的相对路径图片
  if (baseUrl) {
    html = rewriteImageSrc(html, baseUrl);
  }

  return html;
}
