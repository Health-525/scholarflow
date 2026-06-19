"use client";

import { FileText, Plus, ChevronLeft, Search } from "lucide-react";
import { useState, useCallback, useEffect, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createNote, deleteNote, saveNote, useNoteContent, useNoteTree } from "@/hooks/useNotes";
import { buildNotePath } from "@/lib/note-utils";

import { EmptyListState, EmptyWorkspaceState, Workspace } from "./components";
import { flattenTree, SAMPLE_NOTE, type DeletedNote } from "./utils";

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

  const editorKey = isSample ? "__sample__" : selectedPath ?? "__none__";

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

  const workspaceProps = {
    isCreating,
    isSample,
    createTitle,
    setCreateTitle,
    createCategory,
    setCreateCategory,
    createContent,
    setCreateContent,
    createError,
    onCreateSubmit: handleCreate,
    title: workspaceTitle,
    category: workspaceCategory,
    content: workspaceLoading ? "" : isSample ? SAMPLE_NOTE.content : content,
    previewContent,
    onPreviewChange: setPreviewContent,
    isLoading: workspaceLoading,
    error: workspaceError,
    reload: reloadContent,
    editorKey,
    mobileMode,
    onMobileModeChange: setMobileMode,
    saving,
    saveSuccess,
    saveError,
    onSave: handleSave,
    onDelete: handleDelete,
    deletedBuffer,
    onUndoDelete: undoDelete,
  };

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
            <Workspace {...workspaceProps} />
          </div>
        ) : (
          <Card className="h-full flex flex-col rounded-2xl hover:shadow-sm hover:translate-y-0">
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
          <Workspace {...workspaceProps} />
        ) : (
          <EmptyWorkspaceState onCreate={startCreating} onUseSample={openSample} />
        )}
      </main>
    </div>
  );
}
