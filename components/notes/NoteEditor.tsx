"use client";

import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import {
  AlertCircle,
  Bold,
  Code,
  Eye,
  FileDown,
  FileUp,
  Heading1,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  List,
  ListOrdered,
  MoreHorizontal,
  PenLine,
  Quote,
  Redo,
  Strikethrough,
  Trash2,
  Undo,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { exportMarkdown, exportWechatHtml, parseMarkdownFile } from "@/lib/notes/export-import";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";

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
        "h-8 w-8 rounded-md text-muted-foreground/70 hover:bg-muted/70 hover:text-foreground transition-colors",
        active && "bg-muted text-foreground"
      )}
    >
      <Icon className="w-4 h-4" />
    </Button>
  );
}

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-border mx-1" />;
}

function ExportImportMenu({
  onExportMarkdown,
  onExportWechat,
  onImportClick,
}: {
  onExportMarkdown: () => void;
  onExportWechat: () => void;
  onImportClick: () => void;
}) {
  return (
    <Popover>
      <PopoverTrigger
        type="button"
        aria-label="更多"
        title="更多"
        className="h-8 w-8 rounded-md text-muted-foreground/70 hover:bg-muted/70 hover:text-foreground transition-colors inline-flex items-center justify-center"
      >
        <MoreHorizontal className="w-4 h-4" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1">
        <button
          type="button"
          onClick={onExportMarkdown}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-md text-foreground/80 hover:bg-muted/70"
        >
          <FileDown className="w-4 h-4" /> 导出 Markdown
        </button>
        <button
          type="button"
          onClick={onExportWechat}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-md text-foreground/80 hover:bg-muted/70"
        >
          <FileDown className="w-4 h-4" /> 导出公众号
        </button>
        <button
          type="button"
          onClick={onImportClick}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-md text-foreground/80 hover:bg-muted/70"
        >
          <FileUp className="w-4 h-4" /> 导入 Markdown
        </button>
      </PopoverContent>
    </Popover>
  );
}

function ViewDeleteGroup({
  viewMode,
  onViewModeChange,
  onDelete,
}: {
  viewMode?: "edit" | "view";
  onViewModeChange?: (mode: "edit" | "view") => void;
  onDelete?: () => void;
}) {
  if (!onViewModeChange && !onDelete) return null;
  return (
    <ToolbarGroup>
      {onViewModeChange && (
        <ToolbarButton
          label={viewMode === "view" ? "编辑" : "预览"}
          icon={viewMode === "view" ? PenLine : Eye}
          onClick={() => onViewModeChange(viewMode === "view" ? "edit" : "view")}
        />
      )}
      {onDelete && (
        <ToolbarButton
          label="删除笔记"
          icon={Trash2}
          onClick={onDelete}
        />
      )}
    </ToolbarGroup>
  );
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
        <ToolbarButton label="插入图片" icon={ImageIcon} onClick={onInsertImage} />
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
        <ToolbarButton label="撤销" icon={Undo} onClick={() => editor.chain().focus().undo().run()} />
        <ToolbarButton label="重做" icon={Redo} onClick={() => editor.chain().focus().redo().run()} />
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

function DesktopToolbar({
  editor,
  onInsertImage,
  viewMode,
  onViewModeChange,
  onDelete,
  onExportMarkdown,
  onExportWechat,
  onImportClick,
}: {
  editor: Editor;
  onInsertImage: () => void;
  viewMode?: "edit" | "view";
  onViewModeChange?: (mode: "edit" | "view") => void;
  onDelete?: () => void;
  onExportMarkdown: () => void;
  onExportWechat: () => void;
  onImportClick: () => void;
}) {
  return (
    <div className="hidden md:flex flex-wrap items-center gap-0.5 px-1 py-1.5 mb-4 bg-card/60 backdrop-blur-sm sticky top-0 z-10">
      <CommonToolbar editor={editor} onInsertImage={onInsertImage} />
      <ToolbarDivider />
      <ViewDeleteGroup viewMode={viewMode} onViewModeChange={onViewModeChange} onDelete={onDelete} />
      <ToolbarDivider />
      <ExportImportMenu
        onExportMarkdown={onExportMarkdown}
        onExportWechat={onExportWechat}
        onImportClick={onImportClick}
      />
    </div>
  );
}

function MobileToolbar({
  editor,
  onInsertImage,
  viewMode,
  onViewModeChange,
  onDelete,
  onExportMarkdown,
  onExportWechat,
  onImportClick,
}: {
  editor: Editor;
  onInsertImage: () => void;
  viewMode?: "edit" | "view";
  onViewModeChange?: (mode: "edit" | "view") => void;
  onDelete?: () => void;
  onExportMarkdown: () => void;
  onExportWechat: () => void;
  onImportClick: () => void;
}) {
  return (
    <div className="flex md:hidden flex-nowrap items-center gap-0.5 py-2 mb-2 border-b border-border/30 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:w-0">
      <CommonToolbar editor={editor} onInsertImage={onInsertImage} />
      <ToolbarDivider />
      <ViewDeleteGroup viewMode={viewMode} onViewModeChange={onViewModeChange} onDelete={onDelete} />
      <ToolbarDivider />
      <ExportImportMenu
        onExportMarkdown={onExportMarkdown}
        onExportWechat={onExportWechat}
        onImportClick={onImportClick}
      />
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

function hasImageInDataTransfer(items?: DataTransferItemList | null): boolean {
  if (!items) return false;
  return Array.from(items).some((item) => item.kind === "file" && item.type.startsWith("image/"));
}

export function NoteEditor({
  content,
  documentTitle = "",
  onSave,
  onCancel,
  onChange,
  viewMode,
  onViewModeChange,
  onDelete,
  onImportMarkdown,
  className = "",
}: NoteEditorProps) {
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
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

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  const getMarkdown = useCallback((editorInstance: Editor) => {
    try {
      return editorInstance.getMarkdown();
    } catch {
      return editorInstance.getText();
    }
  }, []);

  const triggerSave = useCallback(
    async (editorInstance: Editor) => {
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
    },
    [getMarkdown]
  );

  const flushSave = useCallback(
    (editorInstance: Editor) => {
      return onSaveRef.current(getMarkdown(editorInstance));
    },
    [getMarkdown]
  );

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
          "focus:outline-none min-h-[260px] px-1 py-1"
        ),
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

  const handleExportWechat = useCallback(async () => {
    if (!editor) return;
    await exportWechatHtml(documentTitle || "笔记", getMarkdown(editor));
  }, [editor, documentTitle, getMarkdown]);

  const handleImportClick = useCallback(() => {
    importInputRef.current?.click();
  }, []);

  const handleImportFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !onImportMarkdown) return;
      try {
        const { title, content: md } = await parseMarkdownFile(file);
        onImportMarkdown(title, md);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "导入失败");
      } finally {
        e.target.value = "";
      }
    },
    [onImportMarkdown]
  );

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

  const handleImageFile = useCallback(
    async (file: File) => {
      if (!editor) return;
      if (!isImageFile(file)) return;
      setUploadError(null);
      try {
        const url = await uploadImage(file, { schoolId: schoolId || "", userId: userId || "" });
        insertImageUrl(editor, url);
      } catch (err) {
        const message = err instanceof Error ? err.message : "图片上传失败";
        setUploadError(message);
        // eslint-disable-next-line no-console
        console.error("图片上传失败", err);
      }
    },
    [editor, schoolId, userId, insertImageUrl]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleImageFile(file);
      e.target.value = "";
    },
    [handleImageFile]
  );

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
          if (file) {
            e.preventDefault();
            handleImageFile(file);
            break;
          }
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
    if (hasImageInDataTransfer(e.dataTransfer.items)) {
      e.preventDefault();
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      dragCounter.current = 0;
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file && isImageFile(file)) {
        e.preventDefault();
        handleImageFile(file);
      }
    },
    [handleImageFile]
  );

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
      <input
        ref={importInputRef}
        type="file"
        accept=".md,text/markdown,text/plain"
        className="hidden"
        onChange={handleImportFile}
        aria-label="导入 Markdown"
      />
      <BubbleToolbar editor={editor} onInsertImage={handleInsertImage} />
      <DesktopToolbar
        editor={editor}
        onInsertImage={handleInsertImage}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        onDelete={onDelete}
        onExportMarkdown={handleExportMarkdown}
        onExportWechat={handleExportWechat}
        onImportClick={handleImportClick}
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
      />
      {uploadError && (
        <div className="flex items-center gap-1.5 text-xs text-destructive mb-2">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{uploadError}</span>
        </div>
      )}
      <div
        className="relative"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <EditorContent editor={editor} />
        {isDragging && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 backdrop-blur-sm">
            <span className="text-sm font-medium text-primary">松开以上传图片</span>
          </div>
        )}
      </div>
    </div>
  );
}
