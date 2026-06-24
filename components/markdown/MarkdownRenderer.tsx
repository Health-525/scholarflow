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

    const container = containerRef.current;

    // 一次性注入复制按钮（避免每次 html 变化都重新创建）
    const pres = container.querySelectorAll("pre");
    pres.forEach((pre) => {
      if (pre.querySelector(".code-copy-btn")) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "code-copy-btn";
      button.textContent = "复制";
      button.setAttribute("aria-label", "复制代码");
      pre.appendChild(button);
    });

    // 事件委托处理点击，避免为每个按钮创建闭包
    const handleClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const button = target.closest(".code-copy-btn") as HTMLButtonElement | null;
      if (!button) return;

      const pre = button.closest("pre");
      if (!pre) return;

      const code = pre.querySelector("code")?.textContent || pre.textContent || "";
      try {
        await navigator.clipboard.writeText(code);
        button.textContent = "已复制";
      } catch {
        button.textContent = "复制失败";
      }
      setTimeout(() => {
        button.textContent = "复制";
      }, 2000);
    };

    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
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
