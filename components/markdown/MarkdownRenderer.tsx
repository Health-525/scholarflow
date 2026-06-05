"use client";

import { useMarkdown } from "@/hooks/useMarkdown";
import type { MarkdownOptions } from "@/lib/markdown/processor";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  /** 可选：图片重写所需的笔记路径信息 */
  markdownOptions?: MarkdownOptions;
}

export function MarkdownRenderer({ content, className = "", markdownOptions }: MarkdownRendererProps) {
  const { html, isLoading } = useMarkdown(content, markdownOptions);

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
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default MarkdownRenderer;
