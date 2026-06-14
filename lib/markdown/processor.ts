import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

import { sanitizeHtml } from "@/lib/sanitize";

import calloutPlugin from "./callout-plugin";
import wikiLinkPlugin from "./wiki-link-plugin";

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
