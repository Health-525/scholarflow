"use client";

import { ChevronLeft, FileText, PanelLeftOpen, PenLine, Trash2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { NoteEditor } from "@/components/notes/NoteEditor";
import { NoteViewer } from "@/components/notes/NoteViewer";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/input";
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
  deletedBuffer: DeletedNote | null;
  onUndoDelete: () => Promise<void>;
  onBack?: () => void;
  onOpenSidebar?: () => void;
  titleInputRef?: React.RefObject<HTMLInputElement | null>;
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
    deletedBuffer,
    onUndoDelete,
    onBack,
    onOpenSidebar,
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
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-2.5 border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {onOpenSidebar && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onOpenSidebar}
              aria-label="展开侧边栏"
              className="hidden md:flex h-9 w-9"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </Button>
          )}
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              aria-label="返回列表"
              className="h-9 w-9 md:hidden"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
          {saveError ? (
            <span className="text-xs text-destructive flex items-center gap-1">
              <XCircle className="w-3 h-3" /> {saveError}
            </span>
          ) : saving ? (
            <span className="text-xs text-muted-foreground">保存中…</span>
          ) : null}
        </div>
        {viewMode === "view" && (
          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onViewModeChange("edit")}
              aria-label="编辑"
            >
              <PenLine className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowDeleteConfirm(true)}
              aria-label="删除笔记"
              disabled={isLoading}
              className="hover:text-destructive disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </header>

      {/* Undo toast */}
      {deletedBuffer && Date.now() < deletedBuffer.expiresAt && (
        <div className="flex items-center gap-2 mx-5 mt-3 px-3 py-2 text-sm bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 animate-fade-up motion-reduce:animate-none shrink-0 rounded-lg">
          <span className="flex-1 truncate">已删除「{parseNotePath(deletedBuffer.path).title}」</span>
          <Button variant="secondary" size="sm" onClick={onUndoDelete} className="gap-1">
            <Trash2 size={12} /> 撤销
          </Button>
        </div>
      )}

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
          <div className="max-w-3xl mx-auto px-8 md:px-12 pt-6 pb-16">
            {viewMode === "edit" ? (
              <>
                <Input
                  ref={titleInputRef}
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  onKeyDown={handleTitleKeyDown}
                  placeholder="无标题笔记"
                  className="border-0 bg-transparent px-0 text-3xl md:text-4xl font-medium text-foreground/90 placeholder:text-muted-foreground/25 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none tracking-tight font-display"
                />
                <div className="mt-6">
                  <NoteEditor
                    key={editorKey}
                    content={content}
                    onSave={onSave}
                    onChange={onPreviewChange}
                    viewMode={viewMode}
                    onViewModeChange={onViewModeChange}
                    onDelete={() => setShowDeleteConfirm(true)}
                    className="text-base leading-relaxed"
                  />
                </div>
              </>
            ) : (
              <>
                <h1 className="text-3xl md:text-4xl font-semibold tracking-tight font-display">{title}</h1>
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
