"use client";

import { useState, useRef, useCallback } from "react";
import { Save, X, Bold, Italic, Heading2, List, Code, Link, Quote } from "lucide-react";

interface NoteEditorProps {
  content: string;
  onSave: (content: string) => Promise<void>;
  onCancel: () => void;
}

export function NoteEditor({ content, onSave, onCancel }: NoteEditorProps) {
  const [value, setValue] = useState(content);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    setDirty(true);
  }, []);

  const handleSave = async () => {
    if (saving || !dirty) return;
    setSaving(true);
    try {
      await onSave(value);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  // Keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl/Cmd + S to save
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
    // Escape to cancel
    if (e.key === "Escape") {
      onCancel();
    }
    // Tab inserts spaces
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + "  " + value.substring(end);
      setValue(newValue);
      setDirty(true);
      // Restore cursor position
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      });
    }
  };

  // Insert markdown syntax at cursor
  const insertSyntax = (prefix: string, suffix: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end);
    const replacement = `${prefix}${selected || "文本"}${suffix}`;
    const newValue = value.substring(0, start) + replacement + value.substring(end);
    setValue(newValue);
    setDirty(true);

    // Set cursor position
    requestAnimationFrame(() => {
      const cursorPos = selected ? start + replacement.length : start + prefix.length;
      textarea.selectionStart = start + prefix.length;
      textarea.selectionEnd = selected ? cursorPos : start + prefix.length + (selected || "文本").length;
      textarea.focus();
    });
  };

  const toolbarButtons = [
    { icon: Bold, label: "粗体", action: () => insertSyntax("**", "**") },
    { icon: Italic, label: "斜体", action: () => insertSyntax("*", "*") },
    { icon: Heading2, label: "标题", action: () => insertSyntax("## ") },
    { icon: List, label: "列表", action: () => insertSyntax("- ") },
    { icon: Code, label: "代码", action: () => insertSyntax("`", "`") },
    { icon: Link, label: "链接", action: () => insertSyntax("[", "](url)") },
    { icon: Quote, label: "引用", action: () => insertSyntax("> ") },
  ];

  return (
    <div className="flex flex-col" style={{ minHeight: "300px" }}>
      {/* Toolbar */}
      <div
        className="flex items-center gap-0.5 px-3 py-2 shrink-0"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        {toolbarButtons.map((btn) => (
          <button
            key={btn.label}
            onClick={btn.action}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            title={btn.label}
          >
            <btn.icon className="w-3.5 h-3.5" />
          </button>
        ))}

        <div className="flex-1" />

        {/* Save status */}
        {dirty && (
          <span className="text-[10px] mr-2" style={{ color: "var(--status-warning)" }}>
            未保存
          </span>
        )}

        <button
          onClick={onCancel}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] transition-colors"
          style={{ color: "var(--text-muted)" }}
        >
          <X className="w-3 h-3" />
          取消
        </button>
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
          style={{
            backgroundColor: dirty ? "var(--accent)" : "var(--surface)",
            color: dirty ? "#fff" : "var(--text-muted)",
          }}
        >
          <Save className="w-3 h-3" />
          {saving ? "保存中..." : "保存"}
        </button>
      </div>

      {/* Editor area */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className="flex-1 w-full px-5 py-4 text-[13px] leading-[1.8] outline-none resize-none"
        style={{
          backgroundColor: "transparent",
          color: "var(--text-primary)",
          fontFamily: "ui-monospace, 'Cascadia Mono', 'Consolas', monospace",
          minHeight: "calc(100vh - 340px)",
        }}
        placeholder="开始写作..."
        spellCheck={false}
      />

      {/* Bottom bar */}
      <div
        className="flex items-center justify-between px-4 py-2 text-[10px] shrink-0"
        style={{ borderTop: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}
      >
        <span>{value.length} 字符 · {value.split("\n").length} 行</span>
        <span>Ctrl+S 保存 · Esc 取消</span>
      </div>
    </div>
  );
}
