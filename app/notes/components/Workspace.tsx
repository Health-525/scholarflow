"use client";

import { AlertCircle, ChevronLeft, FolderOpen, History, PenLine, Pin, Trash2, Undo2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { NoteEditor } from "@/components/notes/NoteEditor";
import { NoteViewer } from "@/components/notes/NoteViewer";
import { TagBar } from "@/components/notes/TagBar";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { parseNotePath } from "@/lib/note-utils";

import type { WorkspaceProps } from "../hooks/useNotesPage";

import { HistoryPanel } from "./HistoryPanel";

function SaveStatus({ saving, saveError }: { saving: boolean; saveError: string | null }) {
  if (saveError) {
    return (
      <span className="text-xs text-destructive flex items-center gap-1">
        <XCircle className="w-3 h-3" /> {saveError}
      </span>
    );
  }
  if (saving) {
    return (
      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse-subtle" />
        保存中…
      </span>
    );
  }
  return (
    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-status-success" />
      已自动保存
    </span>
  );
}

function PreviewActions({
  onEdit,
  onDelete,
  onHistory,
}: {
  onEdit: () => void;
  onDelete: () => void;
  onHistory: () => void;
}) {
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      <Button variant="ghost" size="icon-sm" onClick={onHistory} aria-label="历史版本" title="历史版本">
        <History className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label="编辑" title="编辑 (Ctrl+E)">
        <PenLine className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onDelete}
        aria-label="删除笔记"
        title="删除笔记"
        className="hover:text-destructive"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

export function Workspace(props: WorkspaceProps) {
  const {
    path,
    title,
    category,
    content,
    previewContent,
    onPreviewChange,
    isLoading,
    error,
    reload,
    editorKey,
    viewMode,
    onViewModeChange,
    saving,
    saveError,
    onSave,
    onDelete,
    onRename,
    onImportMarkdown,
    deletedBuffer,
    onUndoDelete,
    onBack,
    titleInputRef,
    tags,
    allTags,
    onTagsChange,
    pinned,
    onTogglePin,
    onRestoreVersion,
  } = props;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(title);

  useEffect(() => {
    setEditingTitle(title);
  }, [title]);

  const handleTitleBlur = async () => {
    if (!onRename || editingTitle.trim() === title.trim()) return;
    try {
      await onRename(editingTitle.trim());
    } catch {
      setEditingTitle(title);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Mobile-only minimal header */}
      <header className="md:hidden flex items-center justify-between px-4 py-2.5 border-b border-border/20 shrink-0 bg-background">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              aria-label="返回列表"
              title="返回列表 (Escape)"
              className="h-9 w-9 rounded-lg hover:bg-sidebar-accent"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
          <span className="text-sm font-medium text-foreground truncate">{title}</span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {viewMode === "view" ? (
            <PreviewActions onEdit={() => onViewModeChange("edit")} onDelete={() => setShowDeleteConfirm(true)} onHistory={() => setHistoryOpen(true)} />
          ) : (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setHistoryOpen(true)}
              aria-label="历史版本"
              title="历史版本"
            >
              <History className="w-4 h-4" />
            </Button>
          )}
        </div>
      </header>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="flex-1 overflow-hidden">
          <div className="max-w-3xl mx-auto px-6 md:px-12 pt-8 md:pt-10 pb-20">
            <div className="space-y-4">
              <div className="h-10 bg-muted rounded-lg w-1/2 animate-pulse" />
              <div className="h-4 bg-muted rounded w-24 animate-pulse" />
              <div className="space-y-3 mt-6">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-4 bg-muted rounded w-11/12 animate-pulse" />
                <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
                <div className="h-4 bg-muted rounded w-10/12 animate-pulse" />
                <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-4">
            <AlertCircle className="w-5 h-5 mx-auto mb-2 text-destructive/70" />
            <p className="text-sm mb-1 text-destructive">加载失败</p>
            <p className="text-xs text-muted-foreground mb-3">{error.message}</p>
            <Button variant="secondary" size="sm" className="rounded-lg" onClick={reload}>重试</Button>
          </div>
        </div>
      )}

      {/* Content */}
      {!isLoading && !error && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div
            key={viewMode}
            className="max-w-3xl mx-auto px-6 md:px-12 pt-8 md:pt-10 pb-20"
          >
            {/* Undo toast */}
            {deletedBuffer && (
              <div className="sticky top-0 z-30 mb-6">
                <div className="flex items-center gap-2 px-3 py-2 text-sm bg-sidebar-accent text-primary rounded-lg shadow-sm">
                  <span className="flex-1 truncate">已删除「{parseNotePath(deletedBuffer.path).title}」</span>
                  <Button variant="secondary" size="sm" onClick={onUndoDelete} title="撤销删除 (Ctrl+Z)" className="gap-1 bg-primary text-primary-foreground hover:bg-primary/90">
                    <Undo2 size={12} /> 撤销
                  </Button>
                </div>
              </div>
            )}

            {viewMode === "edit" ? (
              <>
                {category && (
                  <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                    <FolderOpen className="w-3 h-3" />
                    <span>{category}</span>
                  </div>
                )}
                <input
                  ref={titleInputRef}
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  onKeyDown={handleTitleKeyDown}
                  placeholder="无标题笔记"
                  className="w-full h-auto py-2 bg-transparent border-0 px-0 text-2xl md:text-3xl font-semibold text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:ring-offset-0 shadow-none tracking-tight rounded-none"
                />
                <div className="flex items-center justify-end mt-1 mb-4 gap-2">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setHistoryOpen(true)}
                    aria-label="历史版本"
                    title="历史版本"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <History className="w-4 h-4" />
                  </Button>
                  <SaveStatus saving={saving} saveError={saveError} />
                </div>
                <NoteEditor
                  key={editorKey}
                  content={content}
                  documentTitle={title}
                  onSave={onSave}
                  onChange={onPreviewChange}
                  viewMode={viewMode}
                  onViewModeChange={onViewModeChange}
                  onDelete={() => setShowDeleteConfirm(true)}
                  onImportMarkdown={onImportMarkdown}
                  pinned={pinned}
                  onTogglePin={onTogglePin}
                  className="text-base leading-relaxed"
                />
                <div className="border-t border-border pt-3 mt-6">
                  <TagBar tags={tags} allTags={allTags} onTagsChange={onTagsChange} />
                </div>
              </>
            ) : (
              <>
                {category && (
                  <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
                    <FolderOpen className="w-3 h-3" />
                    <span>{category}</span>
                  </div>
                )}
                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-2xl md:text-3xl font-semibold tracking-tight break-words text-foreground">
                    {title}
                  </h1>
                  <div className="hidden md:block pt-1">
                    <PreviewActions onEdit={() => onViewModeChange("edit")} onDelete={() => setShowDeleteConfirm(true)} onHistory={() => setHistoryOpen(true)} />
                  </div>
                </div>
                {pinned && (
                  <div className="flex items-center gap-1.5 mt-3 mb-1">
                    <Pin className="w-3.5 h-3.5 text-status-warning" />
                    <span className="text-xs text-muted-foreground">已固定</span>
                  </div>
                )}
                <div className="pt-6 border-t border-border">
                  <NoteViewer content={previewContent} isMarkdown />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <HistoryPanel
        path={path}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        onRestore={onRestoreVersion}
      />

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="删除笔记"
        description={`确定要删除「${title}」吗？标签也将一并移除。删除后可在 5 秒内撤销。`}
        confirmText="删除"
        onConfirm={onDelete}
      />
    </div>
  );
}
