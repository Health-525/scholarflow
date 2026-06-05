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
 * 预处理：将 Obsidian 的 ![[file-xxx.png]] 替换为标准 Markdown 图片语法
 * 直接在 markdown 字符串层面替换，不依赖 AST
 */
function preprocessObsidianImages(markdown: string, options?: MarkdownOptions): string {
  if (!options?.noteDir || !options?.noteName) return markdown;

  const baseUrl = `https://raw.githubusercontent.com/Health-525/jiangshu-study/main/${options.noteDir}/assets/${options.noteName}`;

  return markdown.replace(
    /!\[\[([^\]]+\.(?:png|jpg|jpeg|gif|webp|svg))(?:\|([^\]]*))?\]\]/gi,
    (_full, filename, _alt) => {
      const url = `${baseUrl}/${filename}`;
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
