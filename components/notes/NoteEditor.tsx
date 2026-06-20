"use client";

import { Save, X, Bold, Heading2, List } from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";

interface NoteEditorProps {
  content: string;
  onSave: (content: string) => Promise<void>;
  onCancel?: () => void;
  onChange?: (value: string) => void;
}

export function NoteEditor({ content, onSave, onCancel, onChange }: NoteEditorProps) {
  const [value, setValue] = useState(content);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimer = useRef<number | null>(null);
  const savingRef = useRef(false);
  const dirtyRef = useRef(false);
  const valueRef = useRef(value);
  const onSaveRef = useRef(onSave);

  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);
  useEffect(() => { valueRef.current = value; }, [value]);
  useEffect(() => { dirtyRef.current = dirty; }, [dirty]);

  const flushSave = useCallback(async () => {
    await onSaveRef.current(valueRef.current);
  }, []);

  const triggerSave = useCallback(async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await flushSave();
      setDirty(false);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [flushSave]);

  // 组件卸载或切换笔记前，如果有未保存的改动则强制落盘
  useEffect(() => {
    return () => {
      if (dirtyRef.current) {
        flushSave().catch(() => {});
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    setDirty(true);
    onChange?.(e.target.value);
  }, [onChange]);

  // Auto-save after 1.5s idle
  useEffect(() => {
    if (!dirty || saving) return;
    if (autoSaveTimer.current) window.clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = window.setTimeout(() => {
      triggerSave();
    }, 1500);
    return () => {
      if (autoSaveTimer.current) window.clearTimeout(autoSaveTimer.current);
    };
  }, [dirty, saving, triggerSave, value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      triggerSave();
    }
    if (e.key === "Escape" && onCancel) {
      onCancel();
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + "  " + value.substring(end);
      setValue(newValue);
      setDirty(true);
      onChange?.(newValue);
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      });
    }
  };

  const insertSyntax = (prefix: string, suffix: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end);
    const placeholder = selected || "文本";
    const replacement = `${prefix}${placeholder}${suffix}`;
    const newValue = value.substring(0, start) + replacement + value.substring(end);
    setValue(newValue);
    setDirty(true);
    onChange?.(newValue);

    requestAnimationFrame(() => {
      const cursorPos = start + replacement.length;
      textarea.selectionStart = start + prefix.length;
      textarea.selectionEnd = selected ? cursorPos : start + prefix.length + placeholder.length;
      textarea.focus();
    });
  };

  const toolbarButtons = [
    { icon: Bold, label: "粗体", action: () => insertSyntax("**", "**") },
    { icon: Heading2, label: "标题", action: () => insertSyntax("## ") },
    { icon: List, label: "列表", action: () => insertSyntax("- ") },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-3 py-2 shrink-0 border-b border-border">
        {toolbarButtons.map((btn) => (
          <button
            key={btn.label}
            type="button"
            onClick={btn.action}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-muted-foreground hover:bg-secondary hover:text-foreground"
            title={btn.label}
            aria-label={btn.label}
          >
            <btn.icon className="w-3.5 h-3.5" />
          </button>
        ))}

        <div className="flex-1" />

        {dirty && (
          <span className="text-[10px] mr-2 text-[var(--status-warning)]">未保存</span>
        )}

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] transition-colors text-muted-foreground hover:bg-secondary"
          >
            <X className="w-3 h-3" />
            取消
          </button>
        )}
        <button
          type="button"
          onClick={triggerSave}
          disabled={!dirty || saving}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
            dirty ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
          }`}
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
        className="flex-1 w-full px-5 py-4 text-[14px] leading-[1.8] outline-none resize-none bg-transparent text-foreground font-mono"
        placeholder="开始写作…"
        spellCheck={false}
      />

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-4 py-2 text-[10px] shrink-0 border-t border-border text-muted-foreground">
        <span>
          {value.length} 字符 · {value.split("\n").length} 行
        </span>
        <span>Ctrl + S 保存 · 停止输入 1.5 秒后自动保存</span>
      </div>
    </div>
  );
}
