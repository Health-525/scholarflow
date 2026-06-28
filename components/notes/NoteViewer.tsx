"use client";

import { useMemo, useEffect, useState } from "react";

import { renderMarkdown } from "@/lib/markdown/processor";

interface NoteViewerProps {
  content: string;
  isMarkdown: boolean;
}

interface TocItem {
  id: string;
  text: string;
  level: number;
}

export function NoteViewer({ content, isMarkdown }: NoteViewerProps) {
  const [html, setHtml] = useState("");
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    if (!isMarkdown || !content) {
      setHtml("");
      return;
    }

    let cancelled = false;
    setRendering(true);

    renderMarkdown(content)
      .then((result) => {
        if (!cancelled) {
          setHtml(result);
          setRendering(false);
        }
      })
      .catch(() => {
        if (!cancelled) setRendering(false);
      });

    return () => {
      cancelled = true;
    };
  }, [content, isMarkdown]);

  const toc = useMemo(() => {
    if (!html) return [];
    const headingRegex = /<h([1-3])\s+id="([^"]*)">([^<]*)</g;
    const items: TocItem[] = [];
    let match;
    while ((match = headingRegex.exec(html)) !== null) {
      items.push({
        level: Number(match[1]),
        id: match[2],
        text: match[3],
      });
    }
    return items;
  }, [html]);

  if (!isMarkdown) {
    return (
      <pre className="text-xs leading-relaxed whitespace-pre-wrap break-words text-[#646A73] font-mono bg-muted/30 rounded-xl p-4">
        {content}
      </pre>
    );
  }

  return (
    <div className="flex gap-8 py-2">
      <div className="flex-1 min-w-0">
        {rendering && (
          <div className="space-y-3 animate-pulse py-8">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-5/6" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        )}
        <div
          className="markdown-body prose prose-slate max-w-none leading-relaxed text-[#1F2329] [&_pre]:rounded-xl [&_pre]:bg-[#F5F6F7] [&_pre]:border [&_pre]:border-[#E5E6EB] [&_code]:text-[13px] [&_blockquote]:border-l-[3px] [&_blockquote]:border-[#3370FF] [&_blockquote]:bg-[#F0F5FF]/50 [&_blockquote]:rounded-r-lg [&_blockquote]:py-1 [&_blockquote]:px-4"
          dangerouslySetInnerHTML={{ __html: html }}
          style={{ display: rendering ? "none" : "block" }}
        />
      </div>

      {toc.length > 3 && (
        <nav className="hidden xl:block w-48 shrink-0">
          <div className="sticky top-20">
            <h4 className="text-xs font-medium text-muted-foreground/60 mb-2 uppercase tracking-wider">
              目录
            </h4>
            <ul className="space-y-0.5 border-l border-[#E5E6EB]">
              {toc.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="block text-xs py-0.5 text-muted-foreground/70 hover:text-primary hover:border-l-[3px] hover:border-l-primary hover:bg-muted/30 rounded-r-lg transition-all duration-150 truncate"
                    style={{
                      paddingLeft: `${(item.level - 1) * 12 + 8}px`,
                    }}
                  >
                    {item.text}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      )}
    </div>
  );
}
