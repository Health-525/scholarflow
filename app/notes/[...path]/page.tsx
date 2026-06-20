"use client";

import { PenLine } from "lucide-react";
import Link from "next/link";
import { use } from "react";

import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { useNoteContent } from "@/hooks/useNotes";

interface PageProps {
  params: Promise<{ path: string[] }>;
}

function isMarkdown(name: string) {
  return name.endsWith(".md");
}

export default function NotesPathPage({ params }: PageProps) {
  const { path } = use(params);
  const notePath = path.map(decodeURIComponent).join("/");
  const fileName = decodeURIComponent(path[path.length - 1]);
  const isMd = isMarkdown(fileName);

  const { content, isLoading, error, reload } = useNoteContent(notePath);

  return (
    <div className="max-w-4xl mx-auto py-6 px-6 pb-24 md:pb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link href="/notes" className="text-[11px] text-primary hover:underline">
            ← 笔记首页
          </Link>
          <h1 className="text-lg font-semibold font-[serif] text-foreground mt-1">
            {fileName}
          </h1>
        </div>
        <Link
          href={`/notes?path=${encodeURIComponent(notePath)}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <PenLine className="w-3 h-3" />
          编辑
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-3">
          <div className="skeleton h-5 rounded" style={{ width: "75%" }} />
          <div className="skeleton h-4 rounded" style={{ width: "60%" }} />
          <div className="skeleton h-4 rounded" style={{ width: "80%" }} />
        </div>
      )}

      {error && <ErrorFallback message={error.message} onRetry={reload} />}

      {!isLoading && !error && (
        <div className="rounded-2xl border border-border bg-card px-5 py-5 animate-fade-up">
          {isMd ? (
            <MarkdownRenderer content={content} />
          ) : (
            <pre className="text-[13px] leading-relaxed overflow-x-auto whitespace-pre-wrap break-words font-mono text-muted-foreground">
              {content}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
