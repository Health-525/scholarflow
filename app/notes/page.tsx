"use client";

import { FileText, PenLine, Eye, Plus, Trash2, XCircle, CheckCircle2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState, useCallback, useEffect } from "react";

import { FileTree } from "@/components/notes/FileTree";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { NoteViewer } from "@/components/notes/NoteViewer";
import { createNote, deleteNote, saveNote, useNoteContent, useNoteTree } from "@/hooks/useNotes";

type ViewMode = "view" | "edit";

function confirmAction(message: string): boolean {
  // eslint-disable-next-line no-alert
  return window.confirm(message);
}

export default function NotesPage() {
  const searchParams = useSearchParams();

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [mode, setMode] = useState<ViewMode>("view");
  const [isCreating, setIsCreating] = useState(false);
  const [newPath, setNewPath] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { content, setContent, isLoading, error, reload } = useNoteContent(selectedPath);
  const { reload: reloadTree } = useNoteTree();

  // Enter edit mode when opened via /notes?path=...
  useEffect(() => {
    const pathFromQuery = searchParams.get("path");
    if (pathFromQuery) {
      setSelectedPath(pathFromQuery);
      setMode("edit");
    }
  }, [searchParams]);

  // Clear transient states when selection changes
  useEffect(() => {
    setSaveSuccess(false);
    setSaveError(null);
    setDeleteError(null);
    setCreateError(null);
    setMode("view");
  }, [selectedPath]);

  const handleSelect = useCallback((path: string) => {
    setSelectedPath(path);
  }, []);

  const handleSave = async (newContent: string) => {
    if (!selectedPath) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      await saveNote(selectedPath, newContent);
      setContent(newContent);
      setSaveSuccess(true);
      setMode("view");
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPath.trim()) return;
    const normalized = normalizeNotePath(newPath);
    try {
      await createNote(normalized);
      setIsCreating(false);
      setNewPath("");
      setSelectedPath(normalized);
      reloadTree();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "创建失败");
    }
  };

  const handleDelete = async () => {
    if (!selectedPath) return;
    if (!confirmAction(`确定删除 "${selectedPath}" 吗？此操作不可撤销。`)) return;
    try {
      await deleteNote(selectedPath);
      setSelectedPath(null);
      reloadTree();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "删除失败");
    }
  };

  const fileName = selectedPath?.split("/").pop() || "";
  const isMarkdown = fileName.endsWith(".md");

  return (
    <div className="h-[calc(100vh-80px)] flex gap-4 max-w-7xl mx-auto py-4 px-4 animate-page">
      {/* Sidebar: file tree */}
      <aside className="w-64 shrink-0 hidden md:flex flex-col rounded-2xl overflow-hidden bg-card border border-border">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            资源管理器
          </span>
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            aria-label="新建笔记"
            title="新建笔记"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {isCreating && (
          <form onSubmit={handleCreate} className="px-3 py-2 border-b border-border">
            <input
              type="text"
              value={newPath}
              onChange={(e) => { setNewPath(e.target.value); setCreateError(null); }}
              placeholder="例如：数学/极限.md"
              className="w-full h-8 px-2 rounded-lg text-[11px] bg-secondary/50 border border-border/60 outline-none focus:border-primary/40"
            />
            {createError && (
              <p className="mt-1 text-[10px] text-destructive">{createError}</p>
            )}
            <div className="flex gap-2 mt-2">
              <button
                type="submit"
                className="flex-1 h-7 rounded-lg text-[10px] bg-primary text-primary-foreground"
              >
                创建
              </button>
              <button
                type="button"
                onClick={() => { setIsCreating(false); setNewPath(""); setCreateError(null); }}
                className="flex-1 h-7 rounded-lg text-[10px] bg-secondary text-secondary-foreground"
              >
                取消
              </button>
            </div>
          </form>
        )}

        <div className="flex-1 overflow-y-auto">
          <FileTree onSelect={handleSelect} activePath={selectedPath ?? undefined} />
        </div>
      </aside>

      {/* Mobile tree */}
      <div className="md:hidden w-full">
        {!selectedPath ? (
          <div className="rounded-2xl overflow-hidden bg-card border border-border">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                资源管理器
              </span>
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                aria-label="新建笔记"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            {isCreating && (
              <form onSubmit={handleCreate} className="px-3 py-2 border-b border-border">
                <input
                  type="text"
                  value={newPath}
                  onChange={(e) => { setNewPath(e.target.value); setCreateError(null); }}
                  placeholder="例如：数学/极限.md"
                  className="w-full h-8 px-2 rounded-lg text-[11px] bg-secondary/50 border border-border/60 outline-none focus:border-primary/40"
                />
                {createError && <p className="mt-1 text-[10px] text-destructive">{createError}</p>}
                <div className="flex gap-2 mt-2">
                  <button type="submit" className="flex-1 h-7 rounded-lg text-[10px] bg-primary text-primary-foreground">创建</button>
                  <button type="button" onClick={() => { setIsCreating(false); setNewPath(""); setCreateError(null); }} className="flex-1 h-7 rounded-lg text-[10px] bg-secondary text-secondary-foreground">取消</button>
                </div>
              </form>
            )}
            <FileTree onSelect={handleSelect} activePath={selectedPath ?? undefined} />
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <button
              onClick={() => setSelectedPath(null)}
              className="mb-3 text-[12px] text-primary"
            >
              ← 返回文件列表
            </button>
            <NoteContent
              path={selectedPath}
              fileName={fileName}
              isMarkdown={isMarkdown}
              content={content}
              isLoading={isLoading}
              error={error}
              reload={reload}
              mode={mode}
              onModeChange={setMode}
              saving={saving}
              saveSuccess={saveSuccess}
              saveError={saveError}
              onSave={handleSave}
              onDelete={handleDelete}
              deleteError={deleteError}
            />
          </div>
        )}
      </div>

      {/* Desktop content */}
      <main className="hidden md:block flex-1 min-w-0">
        {selectedPath ? (
          <NoteContent
            path={selectedPath}
            fileName={fileName}
            isMarkdown={isMarkdown}
            content={content}
            isLoading={isLoading}
            error={error}
            reload={reload}
            mode={mode}
            onModeChange={setMode}
            saving={saving}
            saveSuccess={saveSuccess}
            saveError={saveError}
            onSave={handleSave}
            onDelete={handleDelete}
            deleteError={deleteError}
          />
        ) : (
          <EmptyState onCreate={() => setIsCreating(true)} />
        )}
      </main>
    </div>
  );
}

interface NoteContentProps {
  path: string;
  fileName: string;
  isMarkdown: boolean;
  content: string;
  isLoading: boolean;
  error: Error | null;
  reload: () => void;
  mode: "view" | "edit";
  onModeChange: (m: "view" | "edit") => void;
  saving: boolean;
  saveSuccess: boolean;
  saveError: string | null;
  onSave: (content: string) => Promise<void>;
  onDelete: () => Promise<void>;
  deleteError: string | null;
}

function NoteContent({
  path,
  fileName,
  isMarkdown,
  content,
  isLoading,
  error,
  reload,
  mode,
  onModeChange,
  saving,
  saveSuccess,
  saveError,
  onSave,
  onDelete,
  deleteError,
}: NoteContentProps) {
  return (
    <div className="rounded-2xl overflow-hidden bg-card border border-border h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs">{isMarkdown ? "📝" : "📄"}</span>
          <span className="text-[12px] font-semibold truncate text-foreground">
            {fileName}
          </span>
          <span className="text-[10px] shrink-0 text-muted-foreground">
            {path.replace(`/${fileName}`, "") || "/"}
          </span>
          {saveSuccess && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded animate-fade-up bg-green-500/10 text-green-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> 已保存
            </span>
          )}
          {saving && <span className="text-[10px] text-muted-foreground">保存中...</span>}
          {saveError && (
            <span className="text-[10px] text-destructive flex items-center gap-1">
              <XCircle className="w-3 h-3" /> {saveError}
            </span>
          )}
          {deleteError && (
            <span className="text-[10px] text-destructive flex items-center gap-1">
              <XCircle className="w-3 h-3" /> {deleteError}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isMarkdown && (
            <>
              <button
                type="button"
                onClick={() => onModeChange("view")}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] transition-colors ${
                  mode === "view" ? "bg-primary/10 text-primary" : "text-muted-foreground"
                }`}
              >
                <Eye className="w-3 h-3" />
                阅读
              </button>
              <button
                type="button"
                onClick={() => onModeChange("edit")}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] transition-colors ${
                  mode === "edit" ? "bg-primary/10 text-primary" : "text-muted-foreground"
                }`}
              >
                <PenLine className="w-3 h-3" />
                编辑
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onDelete}
            className="ml-1 p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
            title="删除笔记"
            aria-label="删除笔记"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
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
        {error && !isLoading && (
          <div className="text-center py-20">
            <p className="text-[13px] mb-2 text-red-500">加载失败</p>
            <p className="text-[11px] text-muted-foreground">{error.message}</p>
            <button
              onClick={reload}
              className="mt-3 px-4 py-2 rounded-xl text-[11px] bg-primary/10 text-primary"
            >
              重试
            </button>
          </div>
        )}
        {!isLoading && !error && (
          mode === "edit"
            ? <NoteEditor content={content} onSave={onSave} onCancel={() => onModeChange("view")} />
            : <NoteViewer content={content} isMarkdown={isMarkdown} />
        )}
      </div>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div
      className="rounded-2xl flex flex-col items-center justify-center bg-card border border-border h-full"
    >
      <div className="text-center animate-fade-up">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-primary/10">
          <FileText className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-[14px] font-semibold mb-1.5 text-foreground">
          选择一个笔记开始阅读
        </h3>
        <p className="text-[12px] max-w-[260px] mx-auto leading-relaxed text-muted-foreground mb-4">
          从左侧文件树选择笔记，或创建一篇新笔记
        </p>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          新建笔记
        </button>
      </div>
    </div>
  );
}

function normalizeNotePath(input: string): string {
  let p = input.trim();
  p = p.replace(/\\/g, "/");
  p = p.replace(/^\/+/, "");
  if (!p) return "untitled.md";
  if (!p.includes(".")) p += ".md";
  return p;
}
