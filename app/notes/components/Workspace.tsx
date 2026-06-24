"use client";

import { FileText, Trash2, CheckCircle2, XCircle, Eye, PenLine } from "lucide-react";
import { useState } from "react";

import { NoteEditor } from "@/components/notes/NoteEditor";
import { NoteViewer } from "@/components/notes/NoteViewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
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
  mobileMode: "edit" | "view";
  onMobileModeChange: (m: "edit" | "view") => void;
  saving: boolean;
  saveSuccess: boolean;
  saveError: string | null;
  onSave: (content: string) => Promise<void>;
  onDelete: () => Promise<void>;
  deletedBuffer: DeletedNote | null;
  onUndoDelete: () => Promise<void>;
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
    mobileMode,
    onMobileModeChange,
    saving,
    saveSuccess,
    saveError,
    onSave,
    onDelete,
    deletedBuffer,
    onUndoDelete,
  } = props;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (isCreating) {
    return (
      <Card className="h-full flex flex-col rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">新建笔记</CardTitle>
          <p className="text-xs text-muted-foreground">填写标题即可创建，分类可选</p>
        </CardHeader>
        <form onSubmit={onCreateSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label htmlFor="note-title" className="block text-xs font-medium text-muted-foreground mb-1.5">标题</label>
            <Input
              id="note-title"
              type="text"
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              placeholder="例如：高等数学复习"
              className="h-10"
            />
          </div>
          <div>
            <label htmlFor="note-category" className="block text-xs font-medium text-muted-foreground mb-1.5">分类（可选）</label>
            <Input
              id="note-category"
              type="text"
              value={createCategory}
              onChange={(e) => setCreateCategory(e.target.value)}
              placeholder="例如：数学"
              className="h-10"
            />
          </div>
          <div>
            <label htmlFor="note-content" className="block text-xs font-medium text-muted-foreground mb-1.5">内容</label>
            <Textarea
              id="note-content"
              value={createContent}
              onChange={(e) => setCreateContent(e.target.value)}
              placeholder="从这里开始写…"
              className="min-h-[12rem] resize-none"
            />
          </div>
          {createError && <p className="text-xs text-destructive">{createError}</p>}
          <Button type="submit" className="w-full">创建笔记</Button>
        </form>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col rounded-2xl">
      {/* Header */}
      <CardHeader className="pb-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm">📝</span>
            <CardTitle className="text-base truncate">{title}</CardTitle>
            {category && <Badge variant="secondary" className="shrink-0">{category}</Badge>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <div className="flex md:hidden items-center bg-secondary rounded-lg p-0.5">
              <Button
                variant={mobileMode === "edit" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => onMobileModeChange("edit")}
                className="h-7 gap-1 rounded-md text-xs"
              >
                <PenLine className="w-3 h-3" /> 编辑
              </Button>
              <Button
                variant={mobileMode === "view" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => onMobileModeChange("view")}
                className="h-7 gap-1 rounded-md text-xs"
              >
                <Eye className="w-3 h-3" /> 阅读
              </Button>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={() => setShowDeleteConfirm(true)} aria-label="删除笔记" className="text-muted-foreground hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 min-h-5">
          {saveSuccess && (
            <span className="text-xs font-medium px-1.5 py-0.5 rounded animate-fade-up bg-green-500/10 dark:bg-green-500/15 text-green-600 dark:text-green-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> 已保存
            </span>
          )}
          {saving && <span className="text-xs text-muted-foreground">保存中…</span>}
          {saveError && (
            <span className="text-xs text-destructive flex items-center gap-1">
              <XCircle className="w-3 h-3" /> {saveError}
            </span>
          )}
        </div>
      </CardHeader>

      {/* Undo toast */}
      {deletedBuffer && Date.now() < deletedBuffer.expiresAt && (
        <div className="flex items-center gap-2 px-3 py-2.5 text-sm bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 animate-fade-up shrink-0">
          <span className="flex-1 truncate">已删除「{parseNotePath(deletedBuffer.path).title}」</span>
          <Button variant="secondary" size="sm" onClick={onUndoDelete} className="gap-1">
            <Trash2 size={12} /> 撤销
          </Button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden min-h-0">
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-8 h-8 mx-auto mb-3 rounded-lg flex items-center justify-center animate-breathe bg-primary/10">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">正在打开笔记…</p>
            </div>
          </div>
        )}
        {error && !isLoading && (
          <div className="text-center py-20">
            <p className="text-sm mb-2 text-destructive">加载失败</p>
            <p className="text-xs text-muted-foreground">{error.message}</p>
            <Button variant="secondary" size="sm" onClick={reload} className="mt-3">重试</Button>
          </div>
        )}
        {!isLoading && !error && (
          <div className="flex h-full">
            <div className={`flex-1 min-w-0 h-full ${mobileMode === "view" ? "hidden md:block" : "block"}`}>
              <NoteEditor key={editorKey} content={content} onSave={onSave} onChange={onPreviewChange} />
            </div>
            <div
              className={`flex-1 min-w-0 h-full border-l border-border bg-secondary/20 overflow-y-auto ${
                mobileMode === "edit" ? "hidden md:block" : "block"
              }`}
            >
              <div className="px-5 py-4">
                <NoteViewer content={previewContent} isMarkdown />
              </div>
            </div>
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
    </Card>
  );
}
