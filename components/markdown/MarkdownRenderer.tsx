"use client";

import { useEffect, useRef } from "react";
import { useMarkdown } from "@/hooks/useMarkdown";
import type { MarkdownOptions } from "@/lib/markdown/processor";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  markdownOptions?: MarkdownOptions;
}

function buildBaseUrl(opts?: MarkdownOptions): string | null {
  if (!opts?.noteDir || !opts?.noteName) return null;
  return `https://raw.githubusercontent.com/Health-525/jiangshu-study/main/${opts.noteDir}/assets/${opts.noteName}`;
}

const IMG_EXTS = /\.(png|jpg|jpeg|gif|webp|svg|bmp|ico)$/i;

export function MarkdownRenderer({ content, className = "", markdownOptions }: MarkdownRendererProps) {
  const { html, isLoading } = useMarkdown(content, markdownOptions);
  const containerRef = useRef<HTMLDivElement>(null);

  // DOM层面兜底重写：渲染完成后，扫描所有img，将相对路径替换为GitHub绝对URL
  useEffect(() => {
    const baseUrl = buildBaseUrl(markdownOptions);
    if (!baseUrl || !containerRef.current) return;

    const imgs = containerRef.current.querySelectorAll("img");
    imgs.forEach((img) => {
      const src = img.getAttribute("src") || "";
      // 跳过已处理过的和绝对URL
      if (src.startsWith("http") || src.startsWith("data:") || !IMG_EXTS.test(src)) return;

      const decoded = decodeURIComponent(src.trim());
      const encoded = decoded.split("/").map(encodeURIComponent).join("/");
      img.setAttribute("src", `${baseUrl}/${encoded}`);
      img.classList.add("markdown-image");
      img.setAttribute("loading", "lazy");
    });
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
      ref={containerRef}
      className={`markdown-body ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default MarkdownRenderer;
