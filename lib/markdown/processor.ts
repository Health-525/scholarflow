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

export async function renderMarkdown(markdown: string, _options?: MarkdownOptions): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(calloutPlugin)
    .use(wikiLinkPlugin)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(markdown);

  return sanitizeHtml(String(result));
}
