"use client";

import { useState, useEffect } from "react";
import { renderMarkdown } from "@/lib/markdown/processor";

interface NoteViewerProps {
  content: string;
  isMarkdown: boolean;
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

    renderMarkdown(content).then((result) => {
      if (!cancelled) {
        setHtml(result);
        setRendering(false);
      }
    }).catch(() => {
      if (!cancelled) setRendering(false);
    });

    return () => { cancelled = true; };
  }, [content, isMarkdown]);

  if (!isMarkdown) {
    return (
      <div className="px-5 py-4">
        <pre
          className="text-[12px] leading-relaxed whitespace-pre-wrap break-words"
          style={{ color: "var(--text-secondary)", fontFamily: "ui-monospace, 'Cascadia Mono', monospace" }}
        >
          {content}
        </pre>
      </div>
    );
  }

  return (
    <div className="px-5 py-4">
      {rendering && (
        <div className="text-center py-8">
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>渲染中...</p>
        </div>
      )}
      <div
        className="markdown-body"
        dangerouslySetInnerHTML={{ __html: html }}
        style={{ display: rendering ? "none" : "block" }}
      />
    </div>
  );
}
