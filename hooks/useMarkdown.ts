"use client";

import { useState, useEffect } from "react";
import { renderMarkdown, type MarkdownOptions } from "@/lib/markdown/processor";

function buildBaseUrl(opts?: MarkdownOptions): string {
  if (!opts?.noteDir || !opts?.noteName) return "";
  return `https://raw.githubusercontent.com/Health-525/jiangshu-study/main/${opts.noteDir}/assets/${opts.noteName}`;
}

/**
 * 将 HTML 中相对路径的 img src 替换为 GitHub 绝对 URL
 */
function fixRelativeImageSrcs(html: string, baseUrl: string): string {
  if (!baseUrl) return html;
  return html.replace(
    /(<img[^>]*?\s)src="(?!https?:\/\/)([^"]+)"/gi,
    (_m, before, filename) => {
      const decoded = decodeURIComponent(filename.trim());
      const encoded = decoded.split("/").map(encodeURIComponent).join("/");
      return `${before}src="${baseUrl}/${encoded}"`;
    }
  );
}

export function useMarkdown(
  markdown: string | null | undefined,
  options?: MarkdownOptions
): { html: string; isLoading: boolean } {
  const [html, setHtml] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!markdown) { setHtml(""); return; }

    let cancelled = false;
    setIsLoading(true);

    renderMarkdown(markdown, options)
      .then((result) => {
        if (cancelled) return;
        // 在这里直接修复相对路径图片——不依赖任何组件层逻辑
        const baseUrl = buildBaseUrl(options);
        const fixed = fixRelativeImageSrcs(result, baseUrl);
        setHtml(fixed);
        setIsLoading(false);
      })
      .catch(() => {
        if (!cancelled) { setHtml(""); setIsLoading(false); }
      });

    return () => { cancelled = true; };
  }, [markdown, options?.noteDir, options?.noteName]);

  return { html, isLoading };
}
