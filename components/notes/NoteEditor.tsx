"use client";

import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { AlertCircle, Type } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { exportMarkdown, parseMarkdownFile } from "@/lib/notes/export-import";
import { countArticleStats } from "@/lib/notes/wechat-renderer";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";

import { BubbleToolbar, DesktopToolbar, MobileToolbar } from "./EditorToolbars";
import { WechatPreviewDialog } from "./WechatPreviewDialog";

interface NoteEditorProps {
  content: string;
  documentTitle?: string;
  onSave: (content: string) => Promise<void>;
  onCancel?: () => void;
  onChange?: (value: string) => void;
  viewMode?: "edit" | "view";
  onViewModeChange?: (mode: "edit" | "view") => void;
  onDelete?: () => void;
  onImportMarkdown?: (title: string, content: string) => void;
  pinned?: boolean;
  onTogglePin?: () => void;
  className?: string;
}

async function uploadImage(file: File, auth: { schoolId: string; userId: string }): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("schoolId", auth.schoolId);
  formData.append("userId", auth.userId);
  const res = await fetch("/api/notes/assets", { method: "POST", body: formData });
  if (!res.ok) {
    let detail = `上传失败 (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) detail = `${data.error} (${res.status})`;
    } catch {
      const text = await res.text();
      if (text) detail = `${text} (${res.status})`;
    }
    throw new Error(detail);
  }
  const data = (await res.json()) as { url: string };
  return data.url;
}

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

const EDITOR_EXTENSIONS = [
  StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
  Image.configure({ allowBase64: false }),
  Markdown,
  Placeholder.configure({ placeholder: "开始写点什么吧…" }),
];

function hasImageInDataTransfer(items?: DataTransferItemList | null): boolean {
  if (!items) return false;
  return Array.from(items).some((item) => item.kind === "file" && item.type.startsWith("image/"));
}

export function NoteEditor({
  content, documentTitle = "", onSave, onCancel, onChange,
  viewMode, onViewModeChange, onDelete, onImportMarkdown,
  pinned, onTogglePin, className = "",
}: NoteEditorProps) {
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const autoSaveTimer = useRef<number | null>(null);
  const savingRef = useRef(false);
  const dirtyRef = useRef(false);
  const onSaveRef = useRef(onSave);
  const onChangeRef = useRef(onChange);
  const lastSavedContentRef = useRef(content);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const dragCounter = useRef(0);

  const schoolId = useAuthStore((s) => s.schoolId);
  const userId = useAuthStore((s) => s.userId);

  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { dirtyRef.current = dirty; }, [dirty]);

  const getMarkdown = useCallback((editorInstance: Editor) => {
    try { return editorInstance.getMarkdown(); }
    catch { return editorInstance.getText(); }
  }, []);

  const triggerSave = useCallback(async (editorInstance: Editor) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const markdown = getMarkdown(editorInstance);
      lastSavedContentRef.current = markdown;
      await onSaveRef.current(markdown);
      setDirty(false);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [getMarkdown]);

  const flushSave = useCallback((editorInstance: Editor) => {
    return onSaveRef.current(getMarkdown(editorInstance));
  }, [getMarkdown]);

  const handleInsertImage = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const editor = useEditor({
    extensions: EDITOR_EXTENSIONS,
    content,
    contentType: "markdown",
    editorProps: {
      attributes: {
        class: cn("markdown-body note-prose focus:outline-none min-h-[400px] px-1 py-1"),
      },
    },
    onUpdate: ({ editor: editorInstance }) => {
      const markdown = getMarkdown(editorInstance);
      onChangeRef.current?.(markdown);
      setDirty(true);
    },
  });

  const handleExportMarkdown = useCallback(() => {
    if (!editor) return;
    exportMarkdown(documentTitle || "笔记", getMarkdown(editor));
  }, [editor, documentTitle, getMarkdown]);

  const handleExportWechat = useCallback(() => setPreviewOpen(true), []);
  const handleImportClick = useCallback(() => importInputRef.current?.click(), []);

  const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImportMarkdown) return;
    try {
      const { title, content: md } = await parseMarkdownFile(file);
      onImportMarkdown(title, md);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "导入失败");
    } finally { e.target.value = ""; }
  }, [onImportMarkdown]);

  // Sync external content change
  useEffect(() => {
    if (!editor) return;
    if (content === lastSavedContentRef.current) return;
    editor.commands.setContent(content || "", { contentType: "markdown" });
    lastSavedContentRef.current = content;
    setDirty(false);
  }, [content, editor]);

  // Auto-save after 1.5s idle
  useEffect(() => {
    if (!editor || !dirty || saving) return;
    if (autoSaveTimer.current) window.clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = window.setTimeout(() => { triggerSave(editor); }, 1500);
    return () => { if (autoSaveTimer.current) window.clearTimeout(autoSaveTimer.current); };
  }, [dirty, saving, triggerSave, editor]);

  // Flush on unmount
  useEffect(() => {
    return () => { if (dirtyRef.current && editor) { flushSave(editor).catch(() => {}); } };
  }, [editor, flushSave]);

  const insertImageUrl = useCallback((editorInstance: Editor, url: string) => {
    editorInstance.chain().focus().setImage({ src: url }).run();
  }, []);

  const handleImageFile = useCallback(async (file: File) => {
    if (!editor || !isImageFile(file)) return;
    setUploadError(null);
    try {
      const url = await uploadImage(file, { schoolId: schoolId || "", userId: userId || "" });
      insertImageUrl(editor, url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "图片上传失败";
      setUploadError(message);
    }
  }, [editor, schoolId, userId, insertImageUrl]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
    e.target.value = "";
  }, [handleImageFile]);

  // Keyboard shortcuts & paste
  useEffect(() => {
    if (!editor) return;
    const element = editor.view.dom;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        triggerSave(editor);
      }
      if (e.key === "Escape" && onCancel) {
        e.preventDefault();
        onCancel();
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) { e.preventDefault(); handleImageFile(file); break; }
        }
      }
    };

    element.addEventListener("keydown", handleKeyDown);
    element.addEventListener("paste", handlePaste);
    return () => {
      element.removeEventListener("keydown", handleKeyDown);
      element.removeEventListener("paste", handlePaste);
    };
  }, [editor, onCancel, triggerSave, handleImageFile]);

  // Drag & drop
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!hasImageInDataTransfer(e.dataTransfer.items)) return;
    dragCounter.current += 1;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!hasImageInDataTransfer(e.dataTransfer.items)) return;
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (hasImageInDataTransfer(e.dataTransfer.items)) e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    dragCounter.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && isImageFile(file)) { e.preventDefault(); handleImageFile(file); }
  }, [handleImageFile]);

  const [contentStats, setContentStats] = useState({ chars: 0, readingMinutes: 1 });

  // Update stats when editor content changes (via dirty flag)
  useEffect(() => {
    if (!editor) return;
    setContentStats(countArticleStats(getMarkdown(editor)));
  }, [dirty, editor, getMarkdown]);

  if (!editor) return null;

  return (
    <div className={className}>
      <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml,image/bmp"
        className="hidden" onChange={handleFileSelect} aria-label="插入图片" />
      <input ref={importInputRef} type="file" accept=".md,text/markdown,text/plain"
        className="hidden" onChange={handleImportFile} aria-label="导入 Markdown" />

      <BubbleToolbar editor={editor} />
      <DesktopToolbar
        editor={editor}
        onInsertImage={handleInsertImage}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        onDelete={onDelete}
        onExportMarkdown={handleExportMarkdown}
        onExportWechat={handleExportWechat}
        onImportClick={handleImportClick}
        pinned={pinned}
        onTogglePin={onTogglePin}
      />
      <MobileToolbar
        editor={editor}
        onInsertImage={handleInsertImage}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        onDelete={onDelete}
        onExportMarkdown={handleExportMarkdown}
        onExportWechat={handleExportWechat}
        onImportClick={handleImportClick}
        pinned={pinned}
        onTogglePin={onTogglePin}
      />

      {uploadError && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 mb-2">
          <div className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{uploadError}</span>
          </div>
        </div>
      )}

      <div className="relative" onDragEnter={handleDragEnter} onDragLeave={handleDragLeave}
        onDragOver={handleDragOver} onDrop={handleDrop}>
        <EditorContent editor={editor} />
        {isDragging && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-primary/40 bg-sidebar-accent/95">
            <span className="text-sm font-medium text-primary">松开以上传图片</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground select-none border-t border-border pt-2.5">
        <span className="flex items-center gap-1">
          <Type className="w-3 h-3" />
          {contentStats.chars} 字 · 约 {contentStats.readingMinutes} 分钟阅读
        </span>
        {saving && <span className="text-muted-foreground">保存中…</span>}
      </div>

      <WechatPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen}
        title={documentTitle || "笔记"} content={editor ? getMarkdown(editor) : content} />
    </div>
  );
}
