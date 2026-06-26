"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface NoteEditorProps {
  content: string;
  onSave: (content: string) => Promise<void>;
  onCancel?: () => void;
  onChange?: (value: string) => void;
  className?: string;
}

export function NoteEditor({ content, onSave, onCancel, onChange, className = "" }: NoteEditorProps) {
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

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      className={`w-full h-full resize-none outline-none bg-transparent text-base leading-relaxed text-foreground placeholder:text-muted-foreground/60 ${className}`}
      placeholder="写点什么…"
      spellCheck={false}
    />
  );
}
