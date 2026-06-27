"use client";

import { FileText, PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";

import { Button } from "@/components/ui/button";
import { createNote, deleteNote, renameNote, saveNote, useNoteContent, useNoteTree } from "@/hooks/useNotes";
import { buildNotePath } from "@/lib/note-utils";

import { EmptyListState, EmptyWorkspaceState, Workspace } from "./components";
import { flattenTree, type DeletedNote } from "./utils";

export default function NotesPage() {
  const { tree, isLoading: treeLoading, error: treeError, reload: reloadTree } = useNoteTree();
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"edit" | "view">("edit");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deletedBuffer, setDeletedBuffer] = useState<DeletedNote | null>(null);
  const [previewContent, setPreviewContent] = useState("");
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  const { content, setContent, isLoading: contentLoading, error: contentError, reload: reloadContent } = useNoteContent(selectedPath);

  const editorKey = selectedPath ?? "__none__";

  const notes = useMemo(() => {
    return flattenTree(tree).sort((a, b) => b.updatedAt - a.updatedAt);
  }, [tree]);

  function formatRelativeTime(ts: number): string {
    if (!ts) return "";
    const diff = Date.now() - ts;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "刚刚";
    if (minutes < 60) return `${minutes} 分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小时前`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} 天前`;
    const date = new Date(ts);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }

  useEffect(() => {
    setSaveError(null);
  }, [selectedPath]);

  useEffect(() => {
    setPreviewContent(content);
  }, [content]);

  // 删除提示 5 秒后自动清理
  useEffect(() => {
    if (!deletedBuffer) return;
    const timer = window.setTimeout(() => setDeletedBuffer(null), 5000);
    return () => window.clearTimeout(timer);
  }, [deletedBuffer]);

  const handleSelect = useCallback((path: string) => {
    setSelectedPath(path);
    setViewMode("edit");
  }, []);

  const handleCreate = async () => {
    const baseTitle = "无标题笔记";
    let path = buildNotePath(baseTitle);
    let counter = 1;
    while (notes.some((n) => n.path === path)) {
      path = buildNotePath(`${baseTitle} ${counter}`);
      counter += 1;
    }
    try {
      await createNote(path, "");
      setSelectedPath(path);
      setViewMode("edit");
      reloadTree();
      // 新建后聚焦标题输入
      window.setTimeout(() => titleInputRef.current?.focus(), 80);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "创建失败");
    }
  };

  const handleSave = async (newContent: string) => {
    if (!selectedPath) return;
    setSaving(true);
    setSaveError(null);
    try {
      await saveNote(selectedPath!, newContent);
      setContent(newContent);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPath) return;
    const currentContent = content;
    setDeletedBuffer({ path: selectedPath, content: currentContent, expiresAt: Date.now() + 5000 });
    try {
      await deleteNote(selectedPath);
      setSelectedPath(null);
      reloadTree();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "删除失败");
      setDeletedBuffer(null);
    }
  };

  const handleImportMarkdown = async (title: string, mdContent: string) => {
    const baseTitle = title.trim() || "导入的笔记";
    let path = buildNotePath(baseTitle);
    let counter = 1;
    while (notes.some((n) => n.path === path)) {
      path = buildNotePath(`${baseTitle} ${counter}`);
      counter += 1;
    }
    try {
      await createNote(path, mdContent);
      setSelectedPath(path);
      setViewMode("edit");
      reloadTree();
      window.setTimeout(() => titleInputRef.current?.focus(), 80);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "导入失败");
    }
  };

  const handleRename = async (newTitle: string) => {
    if (!selectedPath) return;
    const trimmed = newTitle.trim();
    if (!trimmed) {
      setSaveError("标题不能为空");
      return;
    }
    const { category } = selectedNote ?? { category: "" };
    const newPath = buildNotePath(trimmed, category);
    if (newPath === selectedPath) return;
    setSaveError(null);
    try {
      await renameNote(selectedPath, newPath);
      setSelectedPath(newPath);
      reloadTree();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "重命名失败");
    }
  };

  const undoDelete = async () => {
    if (!deletedBuffer || Date.now() > deletedBuffer.expiresAt) {
      setDeletedBuffer(null);
      return;
    }
    try {
      await createNote(deletedBuffer.path, deletedBuffer.content);
      setSelectedPath(deletedBuffer.path);
      setDeletedBuffer(null);
      reloadTree();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "撤销失败");
    }
  };

  const handleBack = () => {
    setSelectedPath(null);
  };

  const selectedNote = notes.find((n) => n.path === selectedPath);
  const workspaceTitle = selectedNote?.title || "";
  const workspaceCategory = selectedNote?.category || "";
  const workspaceLoading = contentLoading;
  const workspaceError = contentError;

  const workspaceProps = {
    title: workspaceTitle,
    category: workspaceCategory,
    content: workspaceLoading ? "" : content,
    previewContent,
    onPreviewChange: setPreviewContent,
    isLoading: workspaceLoading,
    error: workspaceError,
    reload: reloadContent,
    editorKey,
    viewMode,
    onViewModeChange: setViewMode,
    saving,
    saveError,
    onSave: handleSave,
    onDelete: handleDelete,
    onRename: handleRename,
    onImportMarkdown: handleImportMarkdown,
    deletedBuffer,
    onUndoDelete: undoDelete,
    onBack: handleBack,
    titleInputRef,
  };

  const sidebarHeader = (
    <div className="flex items-center justify-between px-1">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-muted-foreground/70" />
        <div>
          <h2 className="text-sm font-medium text-foreground">笔记</h2>
          <p className="text-xs text-muted-foreground/70">随手记 · 自动保存</p>
        </div>
      </div>
      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="icon-sm" onClick={handleCreate} aria-label="新建笔记">
          <Plus className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={() => setSidebarOpen(false)} aria-label="收起侧边栏" className="hidden md:flex">
          <PanelLeftClose className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  const renderNoteList = () => {
    if (treeLoading) {
      return <div className="px-3 py-8 text-center text-xs text-muted-foreground">正在整理你的笔记…</div>;
    }
    if (treeError) {
      return (
        <div className="px-3 py-8 text-center">
          <p className="text-xs text-destructive mb-2">加载失败</p>
          <Button variant="link" size="sm" onClick={reloadTree}>重试</Button>
        </div>
      );
    }
    if (notes.length === 0) {
      return <EmptyListState />;
    }
    return (
      <div className="space-y-0.5">
        {notes.map((note) => (
          <button
            key={note.path}
            type="button"
            onClick={() => handleSelect(note.path)}
            className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors ${
              selectedPath === note.path
                ? "bg-primary/5 text-primary font-medium"
                : "text-foreground/80 hover:bg-muted/50"
            }`}
          >
            <span className="block leading-snug break-words">{note.title}</span>
            <span className="block text-xs text-muted-foreground/50 mt-0.5">{formatRelativeTime(note.updatedAt)}</span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="relative flex flex-col md:flex-row h-full w-full -mx-4 md:-mx-6 lg:-mx-8 -mb-20 md:mb-0 overflow-hidden">
      {/* Desktop note list */}
      {sidebarOpen && (
        <aside className="hidden md:flex w-72 shrink-0 flex-col h-full border-r border-border/30 bg-background/50">
          <div className="px-5 py-4 border-b border-border/20">
            {sidebarHeader}
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {renderNoteList()}
          </div>
        </aside>
      )}

      {/* Mobile list */}
      <div className="md:hidden w-full h-full flex flex-col pb-20">
        {selectedPath ? (
          <div className="flex-1 min-h-0 bg-card">
            <Workspace {...workspaceProps} />
          </div>
        ) : (
          <div className="h-full flex flex-col bg-background">
            <div className="px-4 py-4 border-b border-border/20">
              {sidebarHeader}
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {renderNoteList()}
            </div>
          </div>
        )}
      </div>

      {/* Desktop workspace paper */}
      <main className="hidden md:block relative flex-1 min-w-0 h-full bg-card overflow-hidden">
        {!sidebarOpen && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSidebarOpen(true)}
            aria-label="展开侧边栏"
            className="absolute top-3 left-3 z-20 h-9 w-9 text-muted-foreground/70 hover:text-foreground"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </Button>
        )}
        {selectedPath ? (
          <Workspace {...workspaceProps} />
        ) : (
          <EmptyWorkspaceState onCreate={handleCreate} />
        )}
      </main>
    </div>
  );
}
