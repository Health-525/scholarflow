"use client";

import { use } from "react";
import Link from "next/link";
import { useDirectory, useFileContent } from "@/hooks/useNotes";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import { ErrorFallback } from "@/components/ui/ErrorFallback";

interface PageProps {
  params: Promise<{ path: string[] }>;
}

function isMarkdown(name: string) {
  return name.endsWith(".md");
}

function isTextFile(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return ["md", "txt", "js", "ts", "py", "json", "yaml", "yml", "csv"].includes(ext);
}

// ── Directory view ────────────────────────────────────────────
function DirectoryView({ repoPath, parts }: { repoPath: string; parts: string[] }) {
  const { entries, isLoading, error, reload } = useDirectory(repoPath);
  const dirName = decodeURIComponent(parts[parts.length - 1]);

  return (
    <div className="max-w-4xl mx-auto py-6 px-6 pb-24 md:pb-8">
      <h1 className="text-xl font-semibold mb-5 font-[serif] text-foreground">
        {dirName}
      </h1>

      {isLoading && (
        <div className="space-y-2">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-11 rounded-xl" />)}
        </div>
      )}

      {error && <ErrorFallback message={error.message} onRetry={reload} />}

      {!isLoading && !error && entries.length === 0 && (
        <p className="text-[13px] text-muted-foreground">此目录为空</p>
      )}

      {!isLoading && !error && entries.length > 0 && (
        <div className="sf-card divide-y divide-border animate-fade-up">
          {entries.map((entry) => {
            const entryPath = [...parts, encodeURIComponent(entry.name)].join("/");
            return (
              <Link
                key={entry.path}
                href={`/notes/${entryPath}`}
                className="flex items-center gap-3 px-4 py-3 group transition-colors hover:bg-accent/5 first:rounded-t-[calc(var(--radius-lg)-1px)] last:rounded-b-[calc(var(--radius-lg)-1px)]"
                aria-label={entry.name}
              >
                <span className="text-base w-5 text-center shrink-0" aria-hidden="true">
                  {entry.type === "dir" ? "📁" : "📄"}
                </span>
                <span
                  className={`flex-1 text-[13px] truncate ${
                    entry.type === "dir" ? "text-primary font-medium" : "text-foreground"
                  }`}
                >
                  {entry.name}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── File view ─────────────────────────────────────────────────
function FileView({ repoPath, parts }: { repoPath: string; parts: string[] }) {
  const { content, isLoading, error, reload } = useFileContent(repoPath);
  const fileName = decodeURIComponent(parts[parts.length - 1]);

  const noteName = fileName.replace(/\.(md|txt)$/, "");
  const noteDir = parts.slice(0, -1).map(decodeURIComponent).join("/");

  return (
    <div className="max-w-4xl mx-auto py-6 px-6 pb-24 md:pb-8">
      {/* File header */}
      <div className="mb-4">
        <h1 className="text-lg font-semibold font-[serif] text-foreground">
          {fileName}
        </h1>
      </div>

      {isLoading && (
        <div className="space-y-3">
          <div className="skeleton h-5 rounded" style={{ width: "75%" }} />
          <div className="skeleton h-4 rounded" style={{ width: "60%" }} />
          <div className="skeleton h-4 rounded" style={{ width: "80%" }} />
        </div>
      )}

      {error && <ErrorFallback message={error.message} onRetry={reload} />}

      {!isLoading && !error && content && (
        isMarkdown(fileName) ? (
          <div className="sf-card px-5 py-5 animate-fade-up">
            <MarkdownRenderer
              content={content}
              markdownOptions={{ noteDir, noteName }}
            />
          </div>
        ) : (
          <div className="sf-card px-5 py-5 animate-fade-up">
            <pre className="text-[13px] leading-relaxed overflow-x-auto whitespace-pre-wrap break-words font-mono text-muted-foreground">
              {content}
            </pre>
          </div>
        )
      )}
    </div>
  );
}

// ── Page router ───────────────────────────────────────────────
export default function NotesPathPage({ params }: PageProps) {
  const { path } = use(params);
  const repoPath = path.map(decodeURIComponent).join("/");
  const lastName = path[path.length - 1];
  const looksLikeFile = isTextFile(decodeURIComponent(lastName));

  if (looksLikeFile) {
    return <FileView repoPath={repoPath} parts={path} />;
  }
  return <DirectoryView repoPath={repoPath} parts={path} />;
}
