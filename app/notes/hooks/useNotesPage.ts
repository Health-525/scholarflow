"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";

import {
  createNote,
  deleteNote,
  renameNote,
  saveNote,
  useNoteContent,
  useNoteTree,
  useNoteTags,
  togglePin,
} from "@/hooks/useNotes";
import { buildNotePath } from "@/lib/note-utils";

import { flattenTree, type DeletedNote } from "../utils";

export interface WorkspaceProps {
  path: string | null;
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
  onRename: (newTitle: string) => Promise<void>;
  onImportMarkdown: (title: string, content: string) => void;
  deletedBuffer: DeletedNote | null;
  onUndoDelete: () => Promise<void>;
  onBack: () => void;
  titleInputRef: React.RefObject<HTMLInputElement | null>;
  tags: string[];
  allTags: { tag: string; count: number }[];
  onTagsChange: (tags: string[]) => Promise<void>;
  pinned: boolean;
  onTogglePin: () => Promise<void>;
  onRestoreVersion: (content: string) => void;
}

export function useNotesPage() {
  const { tree, isLoading: treeLoading, error: treeError, reload: reloadTree } = useNoteTree();
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"edit" | "view">("edit");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deletedBuffer, setDeletedBuffer] = useState<DeletedNote | null>(null);
  const [previewContent, setPreviewContent] = useState("");
  const [pinned, setPinned] = useState(false);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  const { content, setContent, isLoading: contentLoading, error: contentError, reload: reloadContent } = useNoteContent(selectedPath);
  const { tags, allTags, loadAllTags, saveTags } = useNoteTags(selectedPath);

  const editorKey = selectedPath ?? "__none__";

  const notes = useMemo(() => {
    return flattenTree(tree).sort((a, b) => b.updatedAt - a.updatedAt);
  }, [tree]);

  const selectedNote = notes.find((n) => n.path === selectedPath);

  useEffect(() => {
    setSaveError(null);
  }, [selectedPath]);

  useEffect(() => {
    setPreviewContent(content);
  }, [content]);

  useEffect(() => {
    loadAllTags();
  }, [tree, loadAllTags]);

  useEffect(() => {
    if (!selectedPath) return;
    const note = notes.find((n) => n.path === selectedPath);
    setPinned(note?.pinned ?? false);
  }, [selectedPath, notes]);

  useEffect(() => {
    if (!deletedBuffer) return;
    const timer = window.setTimeout(() => setDeletedBuffer(null), 5000);
    return () => window.clearTimeout(timer);
  }, [deletedBuffer]);

  const handleSelect = useCallback((path: string) => {
    setSelectedPath(path);
    setViewMode("edit");
  }, []);

  const handleCreate = useCallback(async () => {
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
      window.setTimeout(() => titleInputRef.current?.focus(), 80);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "创建失败");
    }
  }, [notes, reloadTree]);

  const handleSave = useCallback(async (newContent: string) => {
    if (!selectedPath) return;
    setSaving(true);
    setSaveError(null);
    try {
      await saveNote(selectedPath, newContent);
      setContent(newContent);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }, [selectedPath, setContent]);

  const handleDelete = useCallback(async () => {
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
  }, [selectedPath, content, reloadTree]);

  const handleImportMarkdown = useCallback(async (title: string, mdContent: string) => {
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
  }, [notes, reloadTree]);

  const handleRename = useCallback(async (newTitle: string) => {
    if (!selectedPath) return;
    const trimmed = newTitle.trim();
    if (!trimmed) { setSaveError("标题不能为空"); return; }
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
  }, [selectedPath, selectedNote, reloadTree]);

  const undoDelete = useCallback(async () => {
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
  }, [deletedBuffer, reloadTree]);

  const handleTogglePin = useCallback(async () => {
    if (!selectedPath) return;
    try {
      await togglePin(selectedPath, !pinned);
      setPinned(!pinned);
      reloadTree();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "操作失败");
    }
  }, [selectedPath, pinned, reloadTree]);

  const handleBack = useCallback(() => setSelectedPath(null), []);

  const handleRestoreVersion = useCallback((restoredContent: string) => {
    setPreviewContent(restoredContent);
    setViewMode("view");
    reloadContent();
  }, [reloadContent]);

  const workspaceProps: WorkspaceProps = {
    path: selectedPath,
    title: selectedNote?.title || "",
    category: selectedNote?.category || "",
    content: contentLoading ? "" : content,
    previewContent,
    onPreviewChange: setPreviewContent,
    isLoading: contentLoading,
    error: contentError,
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
    tags,
    allTags,
    onTagsChange: saveTags,
    pinned,
    onTogglePin: handleTogglePin,
    onRestoreVersion: handleRestoreVersion,
  };

  return {
    // state
    tree, treeLoading, treeError, reloadTree,
    selectedPath, setSelectedPath, sidebarOpen, setSidebarOpen,
    // actions
    handleCreate, handleSelect,
    // derived
    workspaceProps,
  };
}
