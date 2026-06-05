"use client";

import { use } from "react";
import Link from "next/link";
import { useDirectory, useFileContent } from "@/hooks/useNotes";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import { ErrorFallback } from "@/components/ui/ErrorFallback";

interface PageProps {
  params: Promise<{ path: string[] }>;
}

// 根据扩展名判断是否是可渲染的文本文件
function isMarkdown(name: string) {
  return name.endsWith(".md");
}

function isTextFile(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return ["md", "txt", "js", "ts", "py", "json", "yaml", "yml", "csv"].includes(ext);
}

// 文件大小 emoji
function fileIcon(name: string, type: "file" | "dir") {
  if (type === "dir") return "📁";
  if (isMarkdown(name)) return "📄";
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const icons: Record<string, string> = {
    py: "🐍", js: "🟨", ts: "🔷", json: "📋",
    yaml: "⚙️", yml: "⚙️", txt: "📝", csv: "📊",
  };
  return icons[ext] ?? "📄";
}

// Breadcrumb component
function Breadcrumb({ parts }: { parts: string[] }) {
  return (
    <nav aria-label="面包屑导航" className="flex items-center gap-1 flex-wrap text-[12px] mb-5">
      <Link
        href="/notes"
        className="transition-colors hover:opacity-70"
        style={{ color: "var(--accent)" }}
      >
        笔记
      </Link>
      {parts.map((part, i) => {
        const href = "/notes/" + parts.slice(0, i + 1).map(encodeURIComponent).join("/");
        const isLast = i === parts.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            <span style={{ color: "var(--text-muted)" }}>/</span>
            {isLast ? (
              <span style={{ color: "var(--text-secondary)" }}>{decodeURIComponent(part)}</span>
            ) : (
              <Link href={href} className="transition-colors hover:opacity-70" style={{ color: "var(--accent)" }}>
                {decodeURIComponent(part)}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

// ── Directory view ────────────────────────────────────────────
function DirectoryView({ repoPath, parts }: { repoPath: string; parts: string[] }) {
  const { entries, isLoading, error, reload } = useDirectory(repoPath);

  return (
    <div className="max-w-5xl mx-auto py-6 pb-24 md:pb-8">
      <Breadcrumb parts={parts} />

      <h1
        className="text-xl font-semibold mb-5"
        style={{ fontFamily: "'Noto Serif SC', Georgia, serif", color: "var(--text-primary)" }}
      >
        {decodeURIComponent(parts[parts.length - 1])}
      </h1>

      {isLoading && (
        <div className="space-y-2">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-11 rounded-xl" />)}
        </div>
      )}

      {error && <ErrorFallback message={error.message} onRetry={reload} />}

      {!isLoading && !error && entries.length === 0 && (
        <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>此目录为空</p>
      )}

      {!isLoading && !error && entries.length > 0 && (
        <div className="sf-card divide-y animate-fade-up" style={{ borderColor: "var(--border-subtle)" }}>
          {entries.map((entry) => {
            const entryPath = [...parts, encodeURIComponent(entry.name)].join("/");
            return (
              <Link
                key={entry.path}
                href={`/notes/${entryPath}`}
                className="flex items-center gap-3 px-4 py-3 group transition-colors hover:bg-[var(--accent-softer)] first:rounded-t-[calc(var(--radius-lg)-1px)] last:rounded-b-[calc(var(--radius-lg)-1px)]"
                aria-label={entry.name}
              >
                <span className="text-base w-5 text-center shrink-0" aria-hidden="true">
                  {fileIcon(entry.name, entry.type)}
                </span>
                <span
                  className="flex-1 text-[13px] truncate"
                  style={{
                    color: entry.type === "dir" ? "var(--accent)" : "var(--text-primary)",
                    fontWeight: entry.type === "dir" ? 500 : 400,
                  }}
                >
                  {entry.name}
                </span>
                <span
                  className="text-[11px] opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  style={{ color: "var(--text-muted)" }}
                  aria-hidden="true"
                >
                  {entry.type === "dir" ? "打开 →" : "查看"}
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
  const parentParts = parts.slice(0, -1);
  const parentPath = parentParts.length ? "/notes/" + parentParts.join("/") : "/notes";

  // 计算笔记目录和名称（用于图片重写）
  const noteName = fileName.replace(/\.(md|txt)$/, "");
  const noteDir = parentParts.map(decodeURIComponent).join("/");

  return (
    <div className="max-w-4xl mx-auto py-6 pb-24 md:pb-8">
      <Breadcrumb parts={parts} />

      {/* File header */}
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-xl font-semibold"
          style={{ fontFamily: "'Noto Serif SC', Georgia, serif", color: "var(--text-primary)" }}
        >
          {fileName}
        </h1>
        <Link
          href={parentPath}
          className="text-[12px] transition-colors hover:opacity-70"
          style={{ color: "var(--text-muted)" }}
          aria-label="返回上级目录"
        >
          ← 返回
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-3">
          <div className="skeleton h-5 rounded" style={{ width: "75%" }} />
          <div className="skeleton h-4 rounded" style={{ width: "60%" }} />
          <div className="skeleton h-4 rounded" style={{ width: "80%" }} />
          <div className="skeleton h-4 rounded" style={{ width: "50%" }} />
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
          <div
            className="sf-card px-5 py-5 animate-fade-up"
          >
            <pre
              className="text-[13px] leading-relaxed overflow-x-auto whitespace-pre-wrap break-words"
              style={{
                fontFamily: "ui-monospace, 'Cascadia Mono', monospace",
                color: "var(--text-secondary)",
              }}
            >
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

  // Rebuild the repo path (decoded, joined with /)
  const repoPath = path.map(decodeURIComponent).join("/");

  // Determine if this is likely a file or directory by extension
  const lastName = path[path.length - 1];
  const looksLikeFile = isTextFile(decodeURIComponent(lastName));

  if (looksLikeFile) {
    return <FileView repoPath={repoPath} parts={path} />;
  }

  return <DirectoryView repoPath={repoPath} parts={path} />;
}
