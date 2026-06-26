"use client";

import { ChevronLeft, Eye, FileText, PenLine, Trash2, XCircle } from "lucide-react";
import { useState } from "react";

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
    deletedBuffer,
    onUndoDelete,
    onBack,
  } = props;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const cardClass =
    "rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 shadow-sm";

  if (isCreating) {
    return (
      <div className="max-w-2xl mx-auto w-full h-full flex flex-col">
        <div className={`${cardClass} h-full flex flex-col`}>
          <div className="flex items-center justify-between px-5 py-3 shrink-0 border-b border-amber-100/50 dark:border-amber-900/50">
            <h2 className="text-base font-semibold text-amber-950 dark:text-amber-50">新建便签</h2>
            {onBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                aria-label="返回列表"
                className="h-9 w-9 rounded-lg text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            )}
          </div>
          <form onSubmit={onCreateSubmit} className="flex-1 flex flex-col gap-4 min-h-0 px-5 py-4">
            <Input
              type="text"
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              placeholder="标题"
              className="border-0 border-b rounded-none bg-transparent px-0 text-lg font-medium placeholder:text-amber-700/60 dark:placeholder:text-amber-300/60"
            />
            <Input
              type="text"
              value={createCategory}
              onChange={(e) => setCreateCategory(e.target.value)}
              placeholder="分类（可选）"
              className="border-0 border-b rounded-none bg-transparent px-0 text-sm placeholder:text-amber-700/60 dark:placeholder:text-amber-300/60"
            />
            <Textarea
              value={createContent}
              onChange={(e) => setCreateContent(e.target.value)}
              placeholder="从这里开始写…"
              className="flex-1 resize-none border-0 bg-transparent px-0 text-base placeholder:text-amber-700/60 dark:placeholder:text-amber-300/60"
            />
            {createError && <p className="text-xs text-destructive">{createError}</p>}
            <Button type="submit" className="w-full">创建便签</Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto w-full h-full flex flex-col">
      <div className={`${cardClass} h-full flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {onBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                aria-label="返回列表"
                className="h-9 w-9 rounded-lg text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900 md:hidden"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            )}
            {saveError ? (
              <span className="text-xs text-destructive flex items-center gap-1">
                <XCircle className="w-3 h-3" /> {saveError}
              </span>
            ) : saving ? (
              <span className="text-xs text-amber-700/70 dark:text-amber-300/70">保存中…</span>
            ) : saveSuccess ? (
              <span className="text-xs text-green-600 dark:text-green-400">已保存</span>
            ) : null}
          </div>
          <div className="flex items-center gap-1 rounded-xl bg-amber-100/50 dark:bg-amber-900/50 p-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onViewModeChange(viewMode === "edit" ? "view" : "edit")}
              aria-label={viewMode === "edit" ? "预览" : "编辑"}
              className="h-9 w-9 rounded-lg text-amber-700 dark:text-amber-300 hover:bg-amber-200/60 dark:hover:bg-amber-800/60"
            >
              {viewMode === "edit" ? <Eye className="w-4 h-4" /> : <PenLine className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDeleteConfirm(true)}
              aria-label="删除笔记"
              disabled={isLoading}
              className="h-9 w-9 rounded-lg text-amber-700 dark:text-amber-300 hover:text-destructive hover:bg-amber-200/60 dark:hover:bg-amber-800/60 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Undo toast */}
        {deletedBuffer && Date.now() < deletedBuffer.expiresAt && (
          <div className="flex items-center gap-2 px-5 py-2 text-sm bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 animate-fade-up motion-reduce:animate-none shrink-0">
            <span className="flex-1 truncate">已删除「{parseNotePath(deletedBuffer.path).title}」</span>
            <Button variant="secondary" size="sm" onClick={onUndoDelete} className="gap-1">
              <Trash2 size={12} /> 撤销
            </Button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-h-0">
          {isLoading && (
            <div className="flex items-center justify-center h-full px-5">
              <div className="text-center">
                <div className="w-8 h-8 mx-auto mb-2 rounded-lg flex items-center justify-center animate-breathe motion-reduce:animate-none bg-amber-100 dark:bg-amber-900">
                  <FileText className="w-4 h-4 text-amber-700 dark:text-amber-300" />
                </div>
                <p className="text-xs text-amber-700/70 dark:text-amber-300/70">正在打开…</p>
              </div>
            </div>
          )}
          {error && !isLoading && (
            <div className="text-center px-5 py-20">
              <p className="text-sm mb-2 text-destructive">加载失败</p>
              <p className="text-xs text-muted-foreground">{error.message}</p>
              <Button variant="secondary" size="sm" onClick={reload} className="mt-3">重试</Button>
            </div>
          )}
          {!isLoading && !error && (
            <div className="h-full">
              {viewMode === "edit" ? (
                <NoteEditor
                  key={editorKey}
                  content={content}
                  onSave={onSave}
                  onChange={onPreviewChange}
                  className="px-5 py-4"
                />
              ) : (
                <div className="h-full overflow-y-auto px-5 pt-3 pb-5">
                  <NoteViewer content={previewContent} isMarkdown />
                </div>
              )}
            </div>
          )}
        </div>
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
