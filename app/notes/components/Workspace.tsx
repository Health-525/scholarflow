"use client";

import { ChevronLeft, Eye, FileText, PenLine, Trash2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { NoteEditor } from "@/components/notes/NoteEditor";
import { NoteViewer } from "@/components/notes/NoteViewer";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { parseNotePath } from "@/lib/note-utils";

import type { DeletedNote } from "../utils";

export interface WorkspaceProps {
  isCreating: boolean;
  createTitle: string;
  setCreateTitle: (v: string) => void;
  createCategory: string;
  setCreateCategory: (v: string) => void;
  createContent: string;
  setCreateContent: (v: string) => void;
  createError: string | null;
  onCreateSubmit: (e: React.FormEvent) => Promise<void>;
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
  saveSuccess: boolean;
  saveError: string | null;
  onSave: (content: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onRename?: (newTitle: string) => Promise<void>;
  deletedBuffer: DeletedNote | null;
  onUndoDelete: () => Promise<void>;
  onBack?: () => void;
}

export function Workspace(props: WorkspaceProps) {
  const {
    isCreating,
    createTitle,
    setCreateTitle,
    createCategory,
    setCreateCategory,
    createContent,
    setCreateContent,
    createError,
    onCreateSubmit,
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
    saveSuccess,
    saveError,
    onSave,
    onDelete,
    onRename,
    deletedBuffer,
    onUndoDelete,
    onBack,
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

  if (isCreating) {
    return (
      <div className="max-w-3xl mx-auto w-full h-full flex flex-col">
        <div className="flex items-center justify-between px-2 py-2 shrink-0">
          <div />
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
        </div>
        <form onSubmit={onCreateSubmit} className="flex-1 min-h-0 overflow-y-auto px-2 pb-8 space-y-4">
          <Input
            type="text"
            value={createTitle}
            onChange={(e) => setCreateTitle(e.target.value)}
            placeholder="无标题笔记"
            className="border-0 bg-transparent px-0 text-2xl font-semibold placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <Input
            type="text"
            value={createCategory}
            onChange={(e) => setCreateCategory(e.target.value)}
            placeholder="分类（可选）"
            className="border-0 bg-transparent px-0 text-sm placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <Textarea
            value={createContent}
            onChange={(e) => setCreateContent(e.target.value)}
            placeholder="从这里开始写…"
            className="min-h-[200px] resize-none border-0 bg-transparent px-0 text-base placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          {createError && <p className="text-xs text-destructive">{createError}</p>}
          <Button type="submit">创建便签</Button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto w-full h-full flex flex-col">
      {/* Header actions */}
      <div className="flex items-center justify-between px-2 py-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
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
          ) : saveSuccess ? (
            <span className="text-xs text-green-600 dark:text-green-400">已保存</span>
          ) : null}
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onViewModeChange(viewMode === "edit" ? "view" : "edit")}
            aria-label={viewMode === "edit" ? "预览" : "编辑"}
            className="h-9 w-9"
          >
            {viewMode === "edit" ? <Eye className="w-4 h-4" /> : <PenLine className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowDeleteConfirm(true)}
            aria-label="删除笔记"
            disabled={isLoading}
            className="h-9 w-9 hover:text-destructive disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Undo toast */}
      {deletedBuffer && Date.now() < deletedBuffer.expiresAt && (
        <div className="flex items-center gap-2 mx-2 mb-2 px-3 py-2 text-sm bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 animate-fade-up motion-reduce:animate-none shrink-0 rounded-lg">
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
          <div className="text-center px-2 py-20">
            <p className="text-sm mb-2 text-destructive">加载失败</p>
            <p className="text-xs text-muted-foreground">{error.message}</p>
            <Button variant="secondary" size="sm" onClick={reload} className="mt-3">重试</Button>
          </div>
        )}
        {!isLoading && !error && (
          <div className="px-2 pb-8">
            {viewMode === "edit" ? (
              <>
                <Input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  onKeyDown={handleTitleKeyDown}
                  placeholder="无标题笔记"
                  className="border-0 bg-transparent px-0 text-2xl font-semibold placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                {category && <p className="text-xs text-muted-foreground mt-1 mb-3">{category}</p>}
                <NoteEditor
                  key={editorKey}
                  content={content}
                  onSave={onSave}
                  onChange={onPreviewChange}
                  className="text-base leading-relaxed"
                />
              </>
            ) : (
              <>
                <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                {category && <p className="text-xs text-muted-foreground mt-1 mb-4">{category}</p>}
                <div className="pt-2">
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
