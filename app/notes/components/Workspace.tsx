"use client";

import { ChevronLeft, FileText, PenLine, Trash2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { NoteEditor } from "@/components/notes/NoteEditor";
import { NoteViewer } from "@/components/notes/NoteViewer";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { parseNotePath } from "@/lib/note-utils";

import type { DeletedNote } from "../utils";

export interface WorkspaceProps {
  title: string;
  category: string;
  content: string;
  previewContent: string;
  onPreviewChange: (v: string) => void;
  isLoading: boolean;
  error: Error | null;
  reload: () => void;
  editorKey: string;
  viewMode: "edit" | "view";
  onViewModeChange: (m: "edit" | "view") => void;
  saving: boolean;
  saveError: string | null;
  onSave: (content: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onRename?: (newTitle: string) => Promise<void>;
  onImportMarkdown?: (title: string, content: string) => void;
  deletedBuffer: DeletedNote | null;
  onUndoDelete: () => Promise<void>;
  onBack?: () => void;
  titleInputRef?: React.RefObject<HTMLInputElement | null>;
}

function SaveStatus({ saving, saveError }: { saving: boolean; saveError: string | null }) {
  if (saveError) {
    return (
      <span className="text-xs text-destructive flex items-center gap-1">
        <XCircle className="w-3 h-3" /> {saveError}
      </span>
    );
  }
  if (saving) {
    return <span className="text-xs text-muted-foreground/60">保存中…</span>;
  }
  return <span className="text-xs text-muted-foreground/50">已自动保存</span>;
}

function PreviewActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label="编辑">
        <PenLine className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onDelete}
        aria-label="删除笔记"
        className="hover:text-destructive"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

export function Workspace(props: WorkspaceProps) {
  const {
    title,
    category: _category,
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
  } = props;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingTitle, setEditingTitle] = useState(title);

  useEffect(() => {
    setEditingTitle(title);
  }, [title]);

  const handleTitleBlur = async () => {
    if (!onRename || editingTitle.trim() === title.trim()) return;
    try {
      await onRename(editingTitle);
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
      <header className="md:hidden flex items-center justify-between px-4 py-2.5 border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              aria-label="返回列表"
              className="h-9 w-9"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
        </div>
        {viewMode === "view" && (
          <PreviewActions onEdit={() => onViewModeChange("edit")} onDelete={() => setShowDeleteConfirm(true)} />
        )}
      </header>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 mx-auto mb-2 rounded-lg flex items-center justify-center animate-breathe motion-reduce:animate-none bg-muted">
                <FileText className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">正在打开…</p>
            </div>
          </div>
        )}
        {error && !isLoading && (
          <div className="text-center px-4 py-20">
            <p className="text-sm mb-2 text-destructive">加载失败</p>
            <p className="text-xs text-muted-foreground">{error.message}</p>
            <Button variant="secondary" size="sm" onClick={reload} className="mt-3">重试</Button>
          </div>
        )}
        {!isLoading && !error && (
          <div className="max-w-3xl mx-auto px-6 md:px-12 pt-8 md:pt-10 pb-20">
            {/* Undo toast */}
            {deletedBuffer && Date.now() < deletedBuffer.expiresAt && (
              <div className="sticky top-0 z-30 mb-6">
                <div className="flex items-center gap-2 px-3 py-2 text-sm bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-lg">
                  <span className="flex-1 truncate">已删除「{parseNotePath(deletedBuffer.path).title}」</span>
                  <Button variant="secondary" size="sm" onClick={onUndoDelete} className="gap-1">
                    <Trash2 size={12} /> 撤销
                  </Button>
                </div>
              </div>
            )}

            {viewMode === "edit" ? (
              <>
                <input
                  ref={titleInputRef}
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  onKeyDown={handleTitleKeyDown}
                  placeholder="无标题笔记"
                  className="w-full h-auto py-2 bg-transparent border-0 px-0 text-3xl md:text-4xl font-medium text-foreground/90 placeholder:text-muted-foreground/25 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none tracking-tight font-display rounded-none"
                />
                <div className="flex items-center justify-end mt-1 mb-4">
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
                  className="text-base leading-relaxed"
                />
              </>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-3xl md:text-4xl font-semibold tracking-tight font-display break-words">
                    {title}
                  </h1>
                  <div className="hidden md:block pt-1">
                    <PreviewActions onEdit={() => onViewModeChange("edit")} onDelete={() => setShowDeleteConfirm(true)} />
                  </div>
                </div>
                <div className="pt-6">
                  <NoteViewer content={previewContent} isMarkdown />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="删除笔记"
        description={`确定要删除「${title}」吗？删除后可在 5 秒内撤销。`}
        confirmText="删除"
        onConfirm={onDelete}
      />
    </div>
  );
}
