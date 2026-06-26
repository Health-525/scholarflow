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
      <pre className="text-xs leading-relaxed whitespace-pre-wrap break-words text-muted-foreground font-mono">
        {content}
      </pre>
    );
  }

  return (
    <>
      {rendering && (
        <div className="text-center py-8">
          <p className="text-xs text-muted-foreground">渲染中...</p>
        </div>
      )}
      <div
        className="markdown-body"
        dangerouslySetInnerHTML={{ __html: html }}
        style={{ display: rendering ? "none" : "block" }}
      />
    </>
  );
}
