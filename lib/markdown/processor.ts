import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import calloutPlugin from "./callout-plugin";
import wikiLinkPlugin from "./wiki-link-plugin";
import { imageRewritePlugin } from "./image-rewrite-plugin";
import { sanitizeHtml } from "@/lib/sanitize";

export interface MarkdownOptions {
  /** 笔记文件夹路径，如 "01-大数据技术基础/笔记" */
  noteDir?: string;
  /** 笔记名称（不含扩展名），如 "大数据技术基础期末复习" */
  noteName?: string;
}

/**
 * 渲染 Markdown 为安全 HTML
 * 管线：remark-parse → remark-gfm → callout → wikilink → remark-rehype → image-rewrite → rehype-stringify → DOMPurify
 */
export async function renderMarkdown(markdown: string, options?: MarkdownOptions): Promise<string> {
  const pipeline = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(calloutPlugin)
    .use(wikiLinkPlugin)
    .use(remarkRehype, { allowDangerousHtml: true });

  // 图片重写（如果提供了路径信息）
  if (options?.noteDir && options?.noteName) {
    pipeline.use(imageRewritePlugin, {
      noteDir: options.noteDir,
      noteName: options.noteName,
    } as any);
  }

  pipeline.use(rehypeStringify, { allowDangerousHtml: true });

  const result = await pipeline.process(markdown);
  const rawHtml = String(result);
  return sanitizeHtml(rawHtml);
}
