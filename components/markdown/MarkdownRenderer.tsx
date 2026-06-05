"use client";

import { useMemo } from "react";
import { useMarkdown } from "@/hooks/useMarkdown";
import type { MarkdownOptions } from "@/lib/markdown/processor";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  markdownOptions?: MarkdownOptions;
}

function buildBaseUrl(opts?: MarkdownOptions): string {
  if (!opts?.noteDir || !opts?.noteName) return "";
  return `https://raw.githubusercontent.com/Health-525/jiangshu-study/main/${opts.noteDir}/assets/${opts.noteName}`;
}

const IMG_EXT_RE = /\.(png|jpg|jpeg|gif|webp|svg|bmp|ico)$/i;
const RELATIVE_IMG_RE = /src="(?!https?:\/\/)([^"]+\.(?:png|jpg|jpeg|gif|webp|svg|bmp|ico))"/gi;

/**
 * 将 HTML 中所有相对路径的 img src 替换为 GitHub 绝对 URL
 * 在 useMemo 中完成——传入 dangerouslySetInnerHTML 之前
 */
function fixImageUrls(html: string, baseUrl: string): string {
  if (!baseUrl) return html;
  return html.replace(RELATIVE_IMG_RE, (_match, filename) => {
    const decoded = decodeURIComponent(filename.trim());
    const encoded = decoded.split("/").map(encodeURIComponent).join("/");
    return `src="${baseUrl}/${encoded}"`;
  });
}

export function MarkdownRenderer({ content, className = "", markdownOptions }: MarkdownRendererProps) {
  const { html, isLoading } = useMarkdown(content, markdownOptions);

  // 渲染前修复图片URL
  const fixedHtml = useMemo(() => {
    const baseUrl = buildBaseUrl(markdownOptions);
    return fixImageUrls(html, baseUrl);
  }, [html, markdownOptions?.noteDir, markdownOptions?.noteName]);

  if (isLoading) {
    return (
      <div className="py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div
      className={`markdown-body ${className}`}
      dangerouslySetInnerHTML={{ __html: fixedHtml }}
    />
  );
}

export default MarkdownRenderer;
