"use client";

import { useState, useEffect, useCallback } from "react";
import { useGitHubClient } from "@/hooks/useGitHubClient";
import { FileTree } from "@/components/notes/FileTree";
import { NoteViewer } from "@/components/notes/NoteViewer";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { FileText, PenLine, Eye, ArrowLeft } from "lucide-react";

type ViewMode = "view" | "edit";

export default function NotesPage() {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [mode, setMode] = useState<ViewMode>("view");
  const [isMobileTreeOpen, setIsMobileTreeOpen] = useState(true);

  const handleSelect = (path: string) => {
    setSelectedPath(path);
    setMode("view");
    setIsMobileTreeOpen(false); // collapse tree on mobile after selection
  };

  const handleBack = () => {
    setIsMobileTreeOpen(true);
  };

  return (
    <div className="max-w-6xl mx-auto py-4">
      {/* Mobile: toggle between tree and content */}
      <div className="md:hidden">
        {isMobileTreeOpen ? (
          <div>
            <div className="mb-3 px-1">
              <h1
                className="text-lg font-bold"
                style={{ fontFamily: "'Noto Serif SC', Georgia, serif", color: "var(--text-primary)" }}
              >
                笔记
              </h1>
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                jiangshu-study 知识库
              </p>
            </div>
            <div
              className="rounded-2xl overflow-hidden"
              style={{ border: "1px solid var(--border)", backgroundColor: "var(--surface-card)" }}
            >
              <FileTree onSelect={handleSelect} activePath={selectedPath ?? undefined} />
            </div>
          </div>
        ) : (
          <div>
            {/* Back button */}
            <button
              onClick={handleBack}
              className="flex items-center gap-1 mb-3 px-1 text-[12px] transition-colors"
              style={{ color: "var(--accent)" }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              返回文件列表
            </button>
            {selectedPath && (
              <NoteContent
                path={selectedPath}
                mode={mode}
                onModeChange={setMode}
              />
            )}
          </div>
        )}
      </div>

      {/* Desktop: side-by-side layout */}
      <div className="hidden md:flex gap-4" style={{ minHeight: "calc(100vh - 120px)" }}>
        {/* File tree panel */}
        <div
          className="w-64 shrink-0 rounded-2xl overflow-hidden"
          style={{ border: "1px solid var(--border)", backgroundColor: "var(--surface-card)" }}
        >
          <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
              <span className="text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>
                文件浏览器
              </span>
            </div>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
              jiangshu-study
            </p>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
            <FileTree onSelect={handleSelect} activePath={selectedPath ?? undefined} />
          </div>
        </div>

        {/* Content panel */}
        <div className="flex-1 min-w-0">
          {selectedPath ? (
            <NoteContent
              path={selectedPath}
              mode={mode}
              onModeChange={setMode}
            />
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </div>
  );
}

function NoteContent({
  path,
  mode,
  onModeChange,
}: {
  path: string;
  mode: ViewMode;
  onModeChange: (m: ViewMode) => void;
}) {
  const client = useGitHubClient();
  const [content, setContent] = useState("");
  const [sha, setSha] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFile = useCallback(async () => {
    if (!client) return;
    setIsLoading(true);
    setError(null);
    try {
      const file = await client.getFile("content", path);
      setContent(file.content);
      setSha(file.sha);
    } catch (err) {
      setError((err as Error).message || "加载失败");
    } finally {
      setIsLoading(false);
    }
  }, [client, path]);

  useEffect(() => {
    fetchFile();
  }, [fetchFile]);

  const handleSave = async (newContent: string) => {
    if (!client) return;
    try {
      await client.putFile("content", path, newContent, "编辑笔记");
      setContent(newContent);
      // Refresh to get new SHA
      await fetchFile();
      onModeChange("view");
    } catch (err) {
      setError((err as Error).message || "保存失败");
    }
  };

  const fileName = path.split("/").pop() || path;
  const isMarkdown = fileName.endsWith(".md");

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid var(--border)", backgroundColor: "var(--surface-card)" }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs">{isMarkdown ? "📝" : "📄"}</span>
          <span
            className="text-[12px] font-semibold truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {fileName}
          </span>
          <span className="text-[10px] shrink-0" style={{ color: "var(--text-muted)" }}>
            {path.replace(`/${fileName}`, "") || "/"}
          </span>
        </div>
        {isMarkdown && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onModeChange("view")}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] transition-colors"
              style={{
                backgroundColor: mode === "view" ? "var(--accent-soft)" : "transparent",
                color: mode === "view" ? "var(--accent)" : "var(--text-muted)",
              }}
            >
              <Eye className="w-3 h-3" />
              阅读
            </button>
            <button
              onClick={() => onModeChange("edit")}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] transition-colors"
              style={{
                backgroundColor: mode === "edit" ? "var(--accent-soft)" : "transparent",
                color: mode === "edit" ? "var(--accent)" : "var(--text-muted)",
              }}
            >
              <PenLine className="w-3 h-3" />
              编辑
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 250px)" }}>
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-8 h-8 mx-auto mb-3 rounded-lg flex items-center justify-center animate-breathe" style={{ backgroundColor: "var(--accent-soft)" }}>
                <FileText className="w-4 h-4" style={{ color: "var(--accent)" }} />
              </div>
              <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>加载中...</p>
            </div>
          </div>
        )}
        {error && (
          <div className="text-center py-20">
            <p className="text-[13px] mb-2" style={{ color: "var(--status-error)" }}>加载失败</p>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{error}</p>
            <button
              onClick={fetchFile}
              className="mt-3 px-4 py-2 rounded-xl text-[11px]"
              style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}
            >
              重试
            </button>
          </div>
        )}
        {!isLoading && !error && (
          mode === "edit"
            ? <NoteEditor content={content} onSave={handleSave} onCancel={() => onModeChange("view")} />
            : <NoteViewer content={content} isMarkdown={isMarkdown} />
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="rounded-2xl flex items-center justify-center"
      style={{
        border: "1px solid var(--border)",
        backgroundColor: "var(--surface-card)",
        minHeight: "calc(100vh - 200px)",
      }}
    >
      <div className="text-center animate-fade-up">
        <div
          className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: "var(--accent-soft)" }}
        >
          <FileText className="w-6 h-6" style={{ color: "var(--accent)" }} />
        </div>
        <h3
          className="text-[14px] font-semibold mb-1.5"
          style={{ color: "var(--text-primary)" }}
        >
          选择一个笔记开始阅读
        </h3>
        <p className="text-[12px] max-w-[260px] mx-auto leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
          从左侧文件树选择笔记或文件夹，支持 Markdown 预览和在线编辑
        </p>
      </div>
    </div>
  );
}
