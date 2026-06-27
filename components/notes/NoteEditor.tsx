"use client";

import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo,
  Strikethrough,
  Undo,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";

interface NoteEditorProps {
  content: string;
  onSave: (content: string) => Promise<void>;
  onCancel?: () => void;
  onChange?: (value: string) => void;
  className?: string;
}

function ToolbarButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active?: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
        active && "bg-muted text-foreground"
      )}
    >
      <Icon className="w-4 h-4" />
    </Button>
  );
}

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-0.5">
      {children}
    </div>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-border mx-1" />;
}

function CommonToolbar({ editor, onInsertImage }: { editor: Editor; onInsertImage: () => void }) {
  return (
    <>
      <ToolbarGroup>
        <ToolbarButton
          label="粗体"
          icon={Bold}
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          label="斜体"
          icon={Italic}
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          label="删除线"
          icon={Strikethrough}
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />
      </ToolbarGroup>
      <ToolbarDivider />
      <ToolbarGroup>
        <ToolbarButton
          label="一级标题"
          icon={Heading1}
          active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        />
        <ToolbarButton
          label="二级标题"
          icon={Heading2}
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        />
        <ToolbarButton
          label="三级标题"
          icon={Heading3}
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        />
      </ToolbarGroup>
      <ToolbarDivider />
      <ToolbarGroup>
        <ToolbarButton
          label="无序列表"
          icon={List}
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          label="有序列表"
          icon={ListOrdered}
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
      </ToolbarGroup>
      <ToolbarDivider />
      <ToolbarGroup>
        <ToolbarButton
          label="插入图片"
          icon={ImageIcon}
          onClick={onInsertImage}
        />
        <ToolbarButton
          label="引用"
          icon={Quote}
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />
        <ToolbarButton
          label="代码块"
          icon={Code}
          active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        />
      </ToolbarGroup>
      <ToolbarDivider />
      <ToolbarGroup>
        <ToolbarButton
          label="撤销"
          icon={Undo}
          onClick={() => editor.chain().focus().undo().run()}
        />
        <ToolbarButton
          label="重做"
          icon={Redo}
          onClick={() => editor.chain().focus().redo().run()}
        />
      </ToolbarGroup>
    </>
  );
}

function BubbleToolbar({ editor, onInsertImage }: { editor: Editor; onInsertImage: () => void }) {
  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: "top" }}
      className="hidden md:flex items-center gap-0.5 px-1.5 py-1.5 rounded-lg bg-card border border-border shadow-md"
    >
      <CommonToolbar editor={editor} onInsertImage={onInsertImage} />
    </BubbleMenu>
  );
}

function MobileToolbar({ editor, onInsertImage }: { editor: Editor; onInsertImage: () => void }) {
  return (
    <div className="flex md:hidden flex-wrap items-center gap-0.5 py-2 mb-2 border-b border-border/40">
      <CommonToolbar editor={editor} onInsertImage={onInsertImage} />
    </div>
  );
}

async function uploadImage(file: File, auth: { schoolId: string; userId: string }): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("schoolId", auth.schoolId);
  formData.append("userId", auth.userId);

  const res = await fetch("/api/notes/assets", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("图片上传失败");
  const data = (await res.json()) as { url: string };
  return data.url;
}

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

export function NoteEditor({ content, onSave, onCancel, onChange, className = "" }: NoteEditorProps) {
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const autoSaveTimer = useRef<number | null>(null);
  const savingRef = useRef(false);
  const dirtyRef = useRef(false);
  const onSaveRef = useRef(onSave);
  const onChangeRef = useRef(onChange);
  const lastSavedContentRef = useRef(content);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const schoolId = useAuthStore((s) => s.schoolId);
  const userId = useAuthStore((s) => s.userId);

  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { dirtyRef.current = dirty; }, [dirty]);

  const getMarkdown = useCallback((editorInstance: Editor) => {
    try {
      return editorInstance.getMarkdown();
    } catch {
      return editorInstance.getText();
    }
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
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Image.configure({
        allowBase64: false,
      }),
      Markdown,
      Placeholder.configure({
        placeholder: "写点什么…",
      }),
    ],
    content,
    contentType: "markdown",
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm sm:prose-base dark:prose-invert max-w-none",
          "focus:outline-none min-h-[200px] px-1 py-1"
        ),
      },
    },
    onUpdate: ({ editor: editorInstance }) => {
      const markdown = getMarkdown(editorInstance);
      onChangeRef.current?.(markdown);
      setDirty(true);
    },
  });

  // 外部 content 变化时（切换笔记）同步到编辑器
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
    autoSaveTimer.current = window.setTimeout(() => {
      triggerSave(editor);
    }, 1500);
    return () => {
      if (autoSaveTimer.current) window.clearTimeout(autoSaveTimer.current);
    };
  }, [dirty, saving, triggerSave, editor]);

  // 卸载或切换笔记前，如果有未保存的改动则强制落盘
  useEffect(() => {
    return () => {
      if (dirtyRef.current && editor) {
        flushSave(editor).catch(() => {});
      }
    };
  }, [editor, flushSave]);

  const insertImageUrl = useCallback((editorInstance: Editor, url: string) => {
    editorInstance.chain().focus().setImage({ src: url }).run();
  }, []);

  const handleImageFile = useCallback(async (file: File) => {
    if (!editor) return;
    if (!isImageFile(file)) return;
    try {
      const url = await uploadImage(file, { schoolId: schoolId || "", userId: userId || "" });
      insertImageUrl(editor, url);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("图片上传失败", err);
    }
  }, [editor, schoolId, userId, insertImageUrl]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
    e.target.value = "";
  }, [handleImageFile]);

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

    const handleDrop = (e: DragEvent) => {
      const file = e.dataTransfer?.files?.[0];
      if (file && isImageFile(file)) {
        e.preventDefault();
        handleImageFile(file);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      const file = e.dataTransfer?.files?.[0];
      if (file && isImageFile(file)) {
        e.preventDefault();
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            handleImageFile(file);
            break;
          }
        }
      }
    };

    element.addEventListener("keydown", handleKeyDown);
    element.addEventListener("drop", handleDrop);
    element.addEventListener("dragover", handleDragOver);
    element.addEventListener("paste", handlePaste);

    return () => {
      element.removeEventListener("keydown", handleKeyDown);
      element.removeEventListener("drop", handleDrop);
      element.removeEventListener("dragover", handleDragOver);
      element.removeEventListener("paste", handlePaste);
    };
  }, [editor, onCancel, triggerSave, handleImageFile]);

  if (!editor) return null;

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml,image/bmp"
        className="hidden"
        onChange={handleFileSelect}
        aria-label="插入图片"
      />
      <BubbleToolbar editor={editor} onInsertImage={handleInsertImage} />
      <MobileToolbar editor={editor} onInsertImage={handleInsertImage} />
      <EditorContent editor={editor} />
    </div>
  );
}
