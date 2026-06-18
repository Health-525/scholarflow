"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getCurrentUser } from "@/lib/mobile-data";
import { cn } from "@/lib/utils";

interface DailyEditorProps {
  existingDate?: string;
  existingContent?: string;
  onSaved: () => void;
  onCancel: () => void;
}

export function DailyEditor({ existingDate, existingContent, onSaved, onCancel }: DailyEditorProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(existingDate || today);
  const [content, setContent] = useState(existingContent || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!date) return;
    setIsSaving(true);
    setError(null);

    try {
      const { schoolId, userId } = getCurrentUser();
      const body: Record<string, string> = {
        file: `日报/${date}.md`,
        content: content.trim() || "# ",
        action: `创建日报 ${date}`,
        schoolId,
      };
      if (userId) body.userId = userId;
      const res = await fetch("/api/local-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("保存失败");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>{existingDate ? "编辑日报" : "新建日报"}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`# ${date} 日报\n\n## 📋 今日概览\n- 课程：\n- 待办：\n- 提交：\n\n## 📝 变更解读\n\n## 📅 今日课表\n\n## 💡 收获与反思`}
          rows={12}
          className={cn(
            "min-h-[240px] w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm leading-[1.6] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
          )}
        />

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </CardContent>

      <CardFooter className="justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-1 size-4 animate-spin" />}
          {isSaving ? "保存中..." : "保存"}
        </Button>
      </CardFooter>
    </Card>
  );
}
