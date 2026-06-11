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
    setIsMobileTreeOpen(false);
  };

  const handleBack = () => {
    setIsMobileTreeOpen(true);
  };

  return (
    <div className="max-w-6xl mx-auto py-4 animate-page">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-primary/10">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold font-display text-foreground">笔记</h1>
          <p className="text-[12px] text-muted-foreground">jiangshu-study 知识库</p>
        </div>
      </div>

      {/* Mobile: toggle between tree and content */}
      <div className="md:hidden">
        {isMobileTreeOpen ? (
          <div>
            <div className="rounded-2xl overflow-hidden bg-card border border-border">
              <FileTree onSelect={handleSelect} activePath={selectedPath ?? undefined} />
            </div>
          </div>
        ) : (
          <div>
            <button
              onClick={handleBack}
              className="flex items-center gap-1 mb-3 px-1 text-[12px] transition-colors text-primary"
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
        <div className="w-64 shrink-0 rounded-2xl overflow-hidden bg-card border border-border">
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-primary" />
              <span className="text-[12px] font-semibold text-foreground">
                文件浏览器
              </span>
            </div>
            <p className="text-[10px] mt-0.5 text-muted-foreground">
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
  const [_sha, setSha] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

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
    setSaving(true);
    setSaveSuccess(false);
    try {
      await client.putFile("content", path, newContent, "编辑笔记");
      setContent(newContent);
      await fetchFile();
      setSaveSuccess(true);
      onModeChange("view");
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      setError((err as Error).message || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const fileName = path.split("/").pop() || path;
  const isMarkdown = fileName.endsWith(".md");

  return (
    <div className="rounded-2xl overflow-hidden bg-card border border-border">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs">{isMarkdown ? "📝" : "📄"}</span>
          <span className="text-[12px] font-semibold truncate text-foreground">
            {fileName}
          </span>
          <span className="text-[10px] shrink-0 text-muted-foreground">
            {path.replace(`/${fileName}`, "") || "/"}
          </span>
          {saveSuccess && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded animate-fade-up bg-green-500/10 text-green-600">
              已保存 ✓
            </span>
          )}
          {saving && (
            <span className="text-[10px] text-muted-foreground">保存中...</span>
          )}
        </div>
        {isMarkdown && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onModeChange("view")}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] transition-colors ${
                mode === "view" ? "bg-primary/10 text-primary" : "text-muted-foreground"
              }`}
            >
              <Eye className="w-3 h-3" />
              阅读
            </button>
            <button
              onClick={() => onModeChange("edit")}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] transition-colors ${
                mode === "edit" ? "bg-primary/10 text-primary" : "text-muted-foreground"
              }`}
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
              <div className="w-8 h-8 mx-auto mb-3 rounded-lg flex items-center justify-center animate-breathe bg-primary/10">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <p className="text-[12px] text-muted-foreground">加载中...</p>
            </div>
          </div>
        )}
        {error && (
          <div className="text-center py-20">
            <p className="text-[13px] mb-2 text-red-500">加载失败</p>
            <p className="text-[11px] text-muted-foreground">{error}</p>
            <button
              onClick={fetchFile}
              className="mt-3 px-4 py-2 rounded-xl text-[11px] bg-primary/10 text-primary"
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
      className="rounded-2xl flex items-center justify-center bg-card border border-border"
      style={{ minHeight: "calc(100vh - 200px)" }}
    >
      <div className="text-center animate-fade-up">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-primary/10">
          <FileText className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-[14px] font-semibold mb-1.5 text-foreground">
          选择一个笔记开始阅读
        </h3>
        <p className="text-[12px] max-w-[260px] mx-auto leading-relaxed text-muted-foreground">
          从左侧文件树选择笔记或文件夹，支持 Markdown 预览和在线编辑
        </p>
      </div>
    </div>
  );
}