import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import calloutPlugin from "./callout-plugin";
import wikiLinkPlugin from "./wiki-link-plugin";
import { sanitizeHtml } from "@/lib/sanitize";

/**
 * 渲染 Markdown 为安全 HTML
 * 管线：remark-parse → remark-gfm → callout → wikilink → remark-rehype → rehype-stringify → DOMPurify
 */
export async function renderMarkdown(markdown: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(calloutPlugin)
    .use(wikiLinkPlugin)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(markdown);

  const rawHtml = String(result);
  return sanitizeHtml(rawHtml);
}
