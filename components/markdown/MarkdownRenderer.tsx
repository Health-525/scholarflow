"use client";

import { useEffect, useRef } from "react";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useMarkdown } from "@/hooks/useMarkdown";
import type { MarkdownOptions } from "@/lib/markdown/processor";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  markdownOptions?: MarkdownOptions;
  /** 为代码块注入「复制」按钮 */
  showCodeCopy?: boolean;
  /** 异步渲染 Markdown 期间展示的占位内容，常用于避免闪烁 */
  fallback?: React.ReactNode;
}

export function MarkdownRenderer({
  content,
  className = "",
  markdownOptions,
  showCodeCopy,
  fallback,
}: MarkdownRendererProps) {
  const { html, isLoading } = useMarkdown(content, markdownOptions);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showCodeCopy || !containerRef.current || isLoading) return;

    const pres = containerRef.current.querySelectorAll("pre");
    pres.forEach((pre) => {
      if (pre.querySelector(".code-copy-btn")) return;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "code-copy-btn";
      button.textContent = "复制";
      button.onclick = async () => {
        const code = pre.querySelector("code")?.textContent || pre.textContent || "";
        try {
          await navigator.clipboard.writeText(code);
          button.textContent = "已复制";
          setTimeout(() => {
            button.textContent = "复制";
          }, 2000);
        } catch {
          button.textContent = "复制失败";
          setTimeout(() => {
            button.textContent = "复制";
          }, 2000);
        }
      };

      pre.appendChild(button);
    });
  }, [html, isLoading, showCodeCopy]);

  if (isLoading && fallback !== undefined) {
    return (
      <div ref={containerRef} className={`markdown-body ${className}`}>
        <div className="whitespace-pre-wrap">{fallback}</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`markdown-body ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default MarkdownRenderer;
