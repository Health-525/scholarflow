"use client";

import { useState, useEffect } from "react";
import { renderMarkdown, type MarkdownOptions } from "@/lib/markdown/processor";

/**
 * 异步渲染 Markdown，返回 HTML 字符串和加载状态
 */
export function useMarkdown(
  markdown: string | null | undefined,
  options?: MarkdownOptions
): {
  html: string;
  isLoading: boolean;
} {
  const [html, setHtml] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!markdown) {
      setHtml("");
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    renderMarkdown(markdown, options)
      .then((result) => {
        if (!cancelled) {
          setHtml(result);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHtml("");
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [markdown, options?.noteDir, options?.noteName]);

  return { html, isLoading };
}
