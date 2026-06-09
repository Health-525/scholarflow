"use client";

import { useState } from "react";
import { useGitHubClient } from "@/hooks/useGitHubClient";

interface DailyEditorProps {
  existingDate?: string;
  existingContent?: string;
  onSaved: () => void;
  onCancel: () => void;
}

export function DailyEditor({ existingDate, existingContent, onSaved, onCancel }: DailyEditorProps) {
  const client = useGitHubClient();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(existingDate || today);
  const [content, setContent] = useState(existingContent || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!client || !date) return;
    setIsSaving(true);
    setError(null);

    try {
      const path = `日报/${date}.md`;
      await client.putFile("content", path, content.trim() || "# ", `创建日报 ${date}`);
      onSaved();
    } catch (err) {
      setError((err as Error).message || "保存失败");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-2xl p-4 mb-4 bg-card border border-border">
      <h3 className="text-sm font-semibold mb-3 text-foreground">
        {existingDate ? "编辑日报" : "新建日报"}
      </h3>

      <div className="space-y-3">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-3 py-2 rounded-xl text-sm bg-secondary border border-border text-foreground"
        />

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`# ${date} 日报\n\n## 📋 今日概览\n- 课程：\n- 待办：\n- 提交：\n\n## 📝 变更解读\n\n## 📅 今日课表\n\n## 💡 收获与反思`}
          rows={12}
          className="w-full px-3 py-2 rounded-xl text-sm font-mono resize-y bg-secondary border border-border text-foreground leading-[1.6]"
        />

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm border border-border text-muted-foreground"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground ${
              isSaving ? "opacity-50" : ""
            }`}
          >
            {isSaving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
