"use client";

import type { Editor } from "@tiptap/react";
import {
  Bold, Code, Heading1, Heading2, Heading3,
  ImageIcon, Italic, List, ListOrdered, Quote, Redo, Strikethrough, Undo,
} from "lucide-react";

import { ToolbarButton, ToolbarGroup, ToolbarDivider } from "./Toolbar";

export function CommonToolbar({ editor, onInsertImage }: { editor: Editor; onInsertImage: () => void }) {
  return (
    <>
      <ToolbarGroup>
        <ToolbarButton label="粗体" icon={Bold} shortcut="Ctrl+B" active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()} />
        <ToolbarButton label="斜体" icon={Italic} shortcut="Ctrl+I" active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()} />
        <ToolbarButton label="删除线" icon={Strikethrough} shortcut="Ctrl+Shift+X" active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()} />
      </ToolbarGroup>
      <ToolbarDivider />
      <ToolbarGroup>
        <ToolbarButton label="一级标题" icon={Heading1} shortcut="Ctrl+Alt+1" active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} />
        <ToolbarButton label="二级标题" icon={Heading2} shortcut="Ctrl+Alt+2" active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
        <ToolbarButton label="三级标题" icon={Heading3} shortcut="Ctrl+Alt+3" active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
      </ToolbarGroup>
      <ToolbarDivider />
      <ToolbarGroup>
        <ToolbarButton label="无序列表" icon={List} shortcut="Ctrl+Shift+8" active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()} />
        <ToolbarButton label="有序列表" icon={ListOrdered} shortcut="Ctrl+Shift+7" active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()} />
      </ToolbarGroup>
      <ToolbarDivider />
      <ToolbarGroup>
        <ToolbarButton label="插入图片" icon={ImageIcon} onClick={onInsertImage} />
        <ToolbarButton label="引用" icon={Quote} shortcut="Ctrl+Shift+B" active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()} />
        <ToolbarButton label="代码块" icon={Code} shortcut="Ctrl+Alt+C" active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()} />
      </ToolbarGroup>
      <ToolbarDivider />
      <ToolbarGroup>
        <ToolbarButton label="撤销" icon={Undo} shortcut="Ctrl+Z" onClick={() => editor.chain().focus().undo().run()} />
        <ToolbarButton label="重做" icon={Redo} shortcut="Ctrl+Shift+Z" onClick={() => editor.chain().focus().redo().run()} />
      </ToolbarGroup>
    </>
  );
}
