"use client";

import { Bold, Eye, EyeOff, Heading, List, ListOrdered, Loader2, Save } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/ui/ToastContainer";
import { getCurrentUser } from "@/lib/mobile-data";

interface DailyEditorV2Props {
  date: string;
  initialContent?: string;
  onSaved?: () => void;
}

function insertText(textarea: HTMLTextAreaElement, before: string, after: string = "") {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const selected = value.slice(start, end);
  const replacement = `${before}${selected}${after}`;
  textarea.setRangeText(replacement, start, end, "select");
  textarea.focus();
  return textarea.value;
}

export function DailyEditorV2({ date, initialContent = "", onSaved }: DailyEditorV2Props) {
  const [content, setContent] = useState(initialContent);
  const [lastSaved, setLastSaved] = useState(initialContent);
  const [isPreview, setIsPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setContent(initialContent);
    setLastSaved(initialContent);
  }, [initialContent]);

  const saveContent = useCallback(async (): Promise<boolean> => {
    if (!date) return false;
    setIsSaving(true);
    try {
      const { schoolId, userId } = getCurrentUser();
      const body: Record<string, string> = {
        file: `日报/${date}.md`,
        content: content.trim() || "# ",
        action: `更新日报 ${date}`,
        schoolId,
      };
      if (userId) body.userId = userId;
      const res = await fetch("/api/local-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("保存失败");
      setSavedAt(new Date());
      return true;
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "保存失败");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [content, date]);

  async function handleSave() {
    const ok = await saveContent();
    if (ok) {
      setLastSaved(content);
      onSaved?.();
    }
  }

  // 自动保存：停止输入 1.5s 后静默保存（不退出编辑状态）
  useEffect(() => {
    if (!date || content === lastSaved || isSaving) return;
    const timer = setTimeout(() => {
      saveContent().then((ok) => {
        if (ok) setLastSaved(content);
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [content, date, isSaving, lastSaved, saveContent]);

  const handleToolbar = useCallback((action: "bold" | "h2" | "h3" | "ul" | "ol") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    let updated = content;
    switch (action) {
      case "bold":
        updated = insertText(textarea, "**", "**");
        break;
      case "h2":
        updated = insertText(textarea, "## ");
        break;
      case "h3":
        updated = insertText(textarea, "### ");
        break;
      case "ul":
        updated = insertText(textarea, "- ");
        break;
      case "ol":
        updated = insertText(textarea, "1. ");
        break;
    }
    setContent(updated);
  }, [content]);

  return (
    <div className="rounded-xl border border-border/30 bg-surface-elevated/50 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
        <div className="flex items-center gap-0.5">
          <ToolbarButton onClick={() => handleToolbar("bold")} title="加粗">
            <Bold className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => handleToolbar("h2")} title="二级标题">
            <Heading className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => handleToolbar("ul")} title="无序列表">
            <List className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => handleToolbar("ol")} title="有序列表">
            <ListOrdered className="w-4 h-4" />
          </ToolbarButton>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPreview((v) => !v)}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            {isPreview ? <EyeOff className="w-3.5 h-3.5 mr-1.5" /> : <Eye className="w-3.5 h-3.5 mr-1.5" />}
            {isPreview ? "编辑" : "预览"}
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="h-7 px-3 text-xs"
          >
            {isSaving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
            {!isSaving && <Save className="w-3.5 h-3.5 mr-1.5" />}
            {isSaving ? "保存中" : "保存"}
          </Button>
        </div>
      </div>

      <div className="p-0">
        {isPreview ? (
          <div className="min-h-96 max-h-2xl overflow-auto p-5">
            <MarkdownRenderer content={content || "（暂无内容）"} />
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`# ${date} 日报\n\n## 今日概览\n- 课程：\n- 待办：\n- 提交：\n\n## 课表\n\n## 收获与反思`}
            className="min-h-96 max-h-2xl w-full resize-y bg-transparent p-5 text-base leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
          />
        )}
      </div>

      {savedAt && (
        <div className="px-4 py-2 text-xs text-text-tertiary border-t border-border/30 bg-muted/20">
          已保存于 {savedAt.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
        </div>
      )}
    </div>
  );
}

function ToolbarButton({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
    >
      {children}
    </button>
  );
}
