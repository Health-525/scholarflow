"use client";

import { FileText, Plus, Trash2, CheckCircle2, XCircle, ChevronLeft, Eye, PenLine, Search } from "lucide-react";
import { useState, useCallback, useEffect, useMemo } from "react";

import { NoteEditor } from "@/components/notes/NoteEditor";
import { NoteViewer } from "@/components/notes/NoteViewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createNote, deleteNote, saveNote, useNoteContent, useNoteTree } from "@/hooks/useNotes";
import { buildNotePath, parseNotePath } from "@/lib/note-utils";
import type { NoteTreeNode } from "@/types";

interface NoteListItem {
  path: string;
  title: string;
  category: string;
}

interface DeletedNote {
  path: string;
  content: string;
  expiresAt: number;
}

const SAMPLE_NOTE = {
  title: "欢迎使用笔记",
  category: "示例",
  content: "# 欢迎使用笔记\n\n这里可以记录课堂重点、复习提纲或任何想法。\n\n- 支持 Markdown 格式\n- 自动保存\n- 左侧可搜索笔记\n\n右侧会实时显示最终效果。",
};

function flattenTree(nodes: NoteTreeNode[]): NoteListItem[] {
  const result: NoteListItem[] = [];
  function walk(list: NoteTreeNode[], parentCategory: string) {
    for (const node of list) {
      if (node.type === "file") {
        const parsed = parseNotePath(node.path);
        result.push({ path: node.path, title: parsed.title, category: parentCategory });
      }
      if (node.children && node.children.length > 0) {
        walk(node.children, node.type === "dir" ? node.name : parentCategory);
      }
    }
  }
  walk(nodes, "");
  return result;
}

function EmptyListState({ onCreate, onUseSample }: { onCreate: () => void; onUseSample: () => void }) {
  return (
    <Card className="m-3 hover:shadow-sm hover:translate-y-0">
      <CardContent className="text-center py-10 px-4">
        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl flex items-center justify-center bg-primary/10">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <p className="text-[13px] font-medium text-foreground">还没有笔记</p>
        <p className="text-[11px] text-muted-foreground mt-1 mb-4">写下第一条想法，或从示例开始</p>
        <div className="flex flex-col gap-2">
          <Button onClick={onCreate} className="w-full gap-1.5">
            <Plus className="w-3.5 h-3.5" /> 新建笔记
          </Button>
          <Button onClick={onUseSample} variant="secondary" className="w-full gap-1.5">
            <FileText className="w-3.5 h-3.5" /> 查看示例笔记
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyWorkspaceState({ onCreate, onUseSample }: { onCreate: () => void; onUseSample: () => void }) {
  return (
    <Card className="h-full flex flex-col items-center justify-center hover:shadow-sm hover:translate-y-0">
      <CardContent className="text-center animate-fade-up max-w-[320px] px-6 py-12">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-primary/10">
          <FileText className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-[15px] font-semibold mb-1.5 text-foreground">选择一个笔记开始写作</h3>
        <p className="text-[12px] leading-relaxed text-muted-foreground mb-5">
          从左侧选择已有笔记，或创建一篇新笔记。不知道写什么？先看看示例。
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
          <Button onClick={onCreate} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> 新建笔记
          </Button>
          <Button onClick={onUseSample} variant="secondary" className="gap-1.5">
            <FileText className="w-3.5 h-3.5" /> 查看示例
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function NotesPage() {
  const { tree, isLoading: treeLoading, error: treeError, reload: reloadTree } = useNoteTree();
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [isSample, setIsSample] = useState(false);
  const [mobileMode, setMobileMode] = useState<"edit" | "view">("edit");
  const [isCreating, setIsCreating] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createCategory, setCreateCategory] = useState("");
  const [createContent, setCreateContent] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deletedBuffer, setDeletedBuffer] = useState<DeletedNote | null>(null);
  const [previewContent, setPreviewContent] = useState(SAMPLE_NOTE.content);

  const { content, setContent, isLoading: contentLoading, error: contentError, reload: reloadContent } = useNoteContent(selectedPath);

  const notes = useMemo(() => flattenTree(tree), [tree]);
  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => n.title.toLowerCase().includes(q) || n.category.toLowerCase().includes(q));
  }, [notes, search]);

  useEffect(() => {
    setSaveSuccess(false);
    setSaveError(null);
    setCreateError(null);
  }, [selectedPath]);

  useEffect(() => {
    setPreviewContent(isSample ? SAMPLE_NOTE.content : content);
  }, [content, isSample]);

  const handleSelect = useCallback((path: string) => {
    setIsCreating(false);
    setIsSample(false);
    setSelectedPath(path);
    setMobileMode("edit");
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim()) {
      setCreateError("请输入标题");
      return;
    }
    const path = buildNotePath(createTitle, createCategory);
    try {
      await createNote(path, createContent);
      setIsCreating(false);
      setCreateTitle("");
      setCreateCategory("");
      setCreateContent("");
      setCreateError(null);
      setIsSample(false);
      setSelectedPath(path);
      setMobileMode("edit");
      reloadTree();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "创建失败");
    }
  };

  const handleSave = async (newContent: string) => {
    if (!selectedPath && !isSample) return;
    if (isSample) {
      setPreviewContent(newContent);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 1500);
      return;
    }
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);
    try {
      await saveNote(selectedPath!, newContent);
      setContent(newContent);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 1500);
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

  const startCreating = () => {
    setIsCreating(true);
    setIsSample(false);
    setSelectedPath(null);
    setCreateError(null);
    setMobileMode("edit");
  };

  const openSample = () => {
    setIsSample(true);
    setIsCreating(false);
    setSelectedPath(null);
    setMobileMode("edit");
  };

  const selectedNote = notes.find((n) => n.path === selectedPath);
  const workspaceTitle = isSample ? SAMPLE_NOTE.title : selectedNote?.title || "";
  const workspaceCategory = isSample ? SAMPLE_NOTE.category : selectedNote?.category || "";
  const workspaceLoading = !isSample && contentLoading;
  const workspaceError = !isSample ? contentError : null;

  return (
    <div className="h-[calc(100vh-80px)] flex gap-4 max-w-7xl mx-auto py-4 px-4 animate-page">
      {/* Sidebar */}
      <Card className="w-72 shrink-0 hidden md:flex flex-col rounded-2xl hover:shadow-sm hover:translate-y-0">
        <CardHeader className="pb-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary/10">
                <FileText className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-[13px]">笔记</CardTitle>
                <p className="text-[10px] text-muted-foreground">Markdown · 自动保存</p>
              </div>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={startCreating} aria-label="新建笔记">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索笔记…"
              className="h-9 pl-8"
            />
          </div>
        </CardHeader>

        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {treeLoading ? (
            <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">正在整理你的笔记…</div>
          ) : treeError ? (
            <div className="px-4 py-8 text-center">
              <p className="text-[12px] text-destructive mb-2">加载失败</p>
              <Button variant="link" size="sm" onClick={reloadTree}>重试</Button>
            </div>
          ) : filteredNotes.length === 0 ? (
            <EmptyListState onCreate={startCreating} onUseSample={openSample} />
          ) : (
            <div className="space-y-0.5">
              {filteredNotes.map((note) => (
                <button
                  key={note.path}
                  type="button"
                  onClick={() => handleSelect(note.path)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors ${
                    selectedPath === note.path ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${selectedPath === note.path ? "bg-primary" : "bg-muted-foreground/40"}`} />
                    <span className="text-[13px] font-medium truncate flex-1">{note.title}</span>
                  </div>
                  {note.category && <div className="text-[10px] text-muted-foreground mt-0.5 pl-3">{note.category}</div>}
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Mobile list */}
      <div className="md:hidden w-full">
        {selectedPath || isCreating || isSample ? (
          <div className="h-full flex flex-col">
            <Button variant="ghost" size="sm" onClick={() => { setSelectedPath(null); setIsCreating(false); setIsSample(false); }} className="mb-3 w-fit gap-1">
              <ChevronLeft className="w-3.5 h-3.5" /> 返回笔记列表
            </Button>
            <Workspace
              isCreating={isCreating}
              isSample={isSample}
              createTitle={createTitle}
              setCreateTitle={setCreateTitle}
              createCategory={createCategory}
              setCreateCategory={setCreateCategory}
              createContent={createContent}
              setCreateContent={setCreateContent}
              createError={createError}
              onCreateSubmit={handleCreate}
              title={workspaceTitle}
              category={workspaceCategory}
              content={workspaceLoading ? "" : isSample ? SAMPLE_NOTE.content : content}
              previewContent={previewContent}
              onPreviewChange={setPreviewContent}
              isLoading={workspaceLoading}
              error={workspaceError}
              reload={reloadContent}
              mobileMode={mobileMode}
              onMobileModeChange={setMobileMode}
              saving={saving}
              saveSuccess={saveSuccess}
              saveError={saveError}
              onSave={handleSave}
              onDelete={handleDelete}
              deletedBuffer={deletedBuffer}
              onUndoDelete={undoDelete}
            />
          </div>
        ) : (
          <Card className="h-full flex flex-col rounded-2xl hover:shadow-sm hover:translate-y-0">
            <CardHeader className="pb-2 space-y-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[13px]">笔记</CardTitle>
                <Button variant="ghost" size="icon-sm" onClick={startCreating} aria-label="新建笔记">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索笔记…"
                  className="h-9 pl-8"
                />
              </div>
            </CardHeader>
            <div className="flex-1 overflow-y-auto px-3 pb-3">
              {treeLoading ? (
                <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">正在整理你的笔记…</div>
              ) : treeError ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-[12px] text-destructive mb-2">加载失败</p>
                  <Button variant="link" size="sm" onClick={reloadTree}>重试</Button>
                </div>
              ) : filteredNotes.length === 0 ? (
                <EmptyListState onCreate={startCreating} onUseSample={openSample} />
              ) : (
                <div className="space-y-0.5">
                  {filteredNotes.map((note) => (
                    <button
                      key={note.path}
                      type="button"
                      onClick={() => handleSelect(note.path)}
                      className={`w-full text-left px-3 py-3 rounded-xl transition-colors ${
                        selectedPath === note.path ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/50"
                      }`}
                    >
                      <div className="text-[13px] font-medium truncate">{note.title}</div>
                      {note.category && <div className="text-[10px] text-muted-foreground mt-0.5">{note.category}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Desktop workspace */}
      <main className="hidden md:block flex-1 min-w-0">
        {isCreating || isSample || selectedPath ? (
          <Workspace
            isCreating={isCreating}
            isSample={isSample}
            createTitle={createTitle}
            setCreateTitle={setCreateTitle}
            createCategory={createCategory}
            setCreateCategory={setCreateCategory}
            createContent={createContent}
            setCreateContent={setCreateContent}
            createError={createError}
            onCreateSubmit={handleCreate}
            title={workspaceTitle}
            category={workspaceCategory}
            content={workspaceLoading ? "" : isSample ? SAMPLE_NOTE.content : content}
            previewContent={previewContent}
            onPreviewChange={setPreviewContent}
            isLoading={workspaceLoading}
            error={workspaceError}
            reload={reloadContent}
            mobileMode={mobileMode}
            onMobileModeChange={setMobileMode}
            saving={saving}
            saveSuccess={saveSuccess}
            saveError={saveError}
            onSave={handleSave}
            onDelete={handleDelete}
            deletedBuffer={deletedBuffer}
            onUndoDelete={undoDelete}
          />
        ) : (
          <EmptyWorkspaceState onCreate={startCreating} onUseSample={openSample} />
        )}
      </main>
    </div>
  );
}

interface WorkspaceProps {
  isCreating: boolean;
  isSample: boolean;
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

function Workspace(props: WorkspaceProps) {
  const {
    isCreating,
    isSample,
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

  if (isCreating) {
    return (
      <Card className="h-full flex flex-col rounded-2xl hover:shadow-sm hover:translate-y-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-[15px]">新建笔记</CardTitle>
          <p className="text-[11px] text-muted-foreground">填写标题即可创建，分类可选</p>
        </CardHeader>
        <form onSubmit={onCreateSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label htmlFor="note-title" className="block text-[12px] font-medium text-muted-foreground mb-1.5">标题</label>
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
            <label htmlFor="note-category" className="block text-[12px] font-medium text-muted-foreground mb-1.5">分类（可选）</label>
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
            <label htmlFor="note-content" className="block text-[12px] font-medium text-muted-foreground mb-1.5">内容</label>
            <textarea
              id="note-content"
              value={createContent}
              onChange={(e) => setCreateContent(e.target.value)}
              placeholder="从这里开始写…"
              className="w-full h-48 px-3 py-2.5 rounded-xl text-sm bg-secondary border border-border text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 resize-none"
            />
          </div>
          {createError && <p className="text-[11px] text-destructive">{createError}</p>}
          <Button type="submit" className="w-full">创建笔记</Button>
        </form>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col rounded-2xl hover:shadow-sm hover:translate-y-0">
      {/* Header */}
      <CardHeader className="pb-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm">📝</span>
            <CardTitle className="text-[15px] truncate">{title}</CardTitle>
            {category && <Badge variant="secondary" className="shrink-0">{category}</Badge>}
            {isSample && <Badge variant="outline" className="shrink-0 text-amber-600 border-amber-200 bg-amber-500/10">示例</Badge>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <div className="flex md:hidden items-center bg-secondary rounded-lg p-0.5">
              <Button
                variant={mobileMode === "edit" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => onMobileModeChange("edit")}
                className="h-7 gap-1 rounded-md text-[11px]"
              >
                <PenLine className="w-3 h-3" /> 编辑
              </Button>
              <Button
                variant={mobileMode === "view" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => onMobileModeChange("view")}
                className="h-7 gap-1 rounded-md text-[11px]"
              >
                <Eye className="w-3 h-3" /> 阅读
              </Button>
            </div>
            {!isSample && (
              <Button variant="ghost" size="icon-sm" onClick={onDelete} aria-label="删除笔记" className="text-muted-foreground hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 min-h-5">
          {saveSuccess && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded animate-fade-up bg-green-500/10 dark:bg-green-500/15 text-green-600 dark:text-green-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> 已保存
            </span>
          )}
          {saving && <span className="text-[10px] text-muted-foreground">保存中…</span>}
          {saveError && (
            <span className="text-[10px] text-destructive flex items-center gap-1">
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
              <p className="text-[12px] text-muted-foreground">正在打开笔记…</p>
            </div>
          </div>
        )}
        {error && !isLoading && (
          <div className="text-center py-20">
            <p className="text-[13px] mb-2 text-destructive">加载失败</p>
            <p className="text-[11px] text-muted-foreground">{error.message}</p>
            <Button variant="secondary" size="sm" onClick={reload} className="mt-3">重试</Button>
          </div>
        )}
        {!isLoading && !error && (
          <div className="flex h-full">
            <div className={`flex-1 min-w-0 h-full ${mobileMode === "view" ? "hidden md:block" : "block"}`}>
              <NoteEditor content={content} onSave={onSave} onChange={onPreviewChange} />
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
    </Card>
  );
}
