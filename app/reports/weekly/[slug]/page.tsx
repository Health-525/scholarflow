"use client";

import { Loader2, Pencil, RotateCcw, Save, Sparkles, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { showToast } from "@/components/ui/ToastContainer";
import { useReportContent } from "@/hooks/useReports";
import { getAuthParams } from "@/lib/api/auth-params";

export default function WeeklyReportPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { content, theme, ai, isLoading, error, reload } = useReportContent("weekly", slug);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);
  const [draftTheme, setDraftTheme] = useState(theme ?? "");
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (!editing) {
      setDraft(content);
      setDraftTheme(theme ?? "");
    }
  }, [content, theme, editing]);

  useEffect(() => {
    if (!editing) return;

    const handler = (e: BeforeUnloadEvent) => {
      if (draft !== content || draftTheme !== (theme ?? "")) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [editing, draft, content, draftTheme, theme]);

  let weekLabel = slug;
  try {
    const parts = slug.split("_");
    if (parts.length >= 2) {
      const start = new Date(parts[0]).toLocaleDateString("zh-CN", { month: "long", day: "numeric" });
      const end = new Date(parts[1]).toLocaleDateString("zh-CN", { month: "long", day: "numeric" });
      weekLabel = `${start} — ${end}`;
    }
  } catch {
    // keep raw
  }

  const hasChanges = draft !== content || draftTheme !== (theme ?? "");

  const handleSave = async () => {
    if (!hasChanges) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/reports/weekly/${encodeURIComponent(slug)}?${getAuthParams()}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft, theme: draftTheme.trim() || theme }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        showToast("success", "周报已保存");
        setEditing(false);
        reload();
      } else {
        showToast("error", data.error || "保存失败");
      }
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(content);
    setDraftTheme(theme ?? "");
    setEditing(false);
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await fetch(`/api/reports/weekly/generate?${getAuthParams()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = (await res.json()) as { ok?: boolean; ai?: boolean; error?: string };
      if (res.ok && data.ok) {
        showToast("success", data.ai ? "AI 已重新生成周报" : "已使用模板重新生成周报");
        reload();
      } else {
        showToast("error", data.error || "重新生成失败");
      }
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "重新生成失败");
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm mb-4 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="返回周报列表"
      >
        ← 返回
      </button>

      <div className="mb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {weekLabel}
          </h1>
          {!editing && theme && (
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-primary border-primary/30 font-normal">
                {theme}
              </Badge>
              {ai && (
                <Badge variant="outline" className="text-amber-600 border-amber-200 dark:border-amber-800 font-normal gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI 生成
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving} className="gap-1">
                <X className="w-4 h-4" />
                取消
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving || !hasChanges} className="gap-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                保存
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1">
                <Pencil className="w-4 h-4" />
                编辑
              </Button>
              <Button size="sm" onClick={handleRegenerate} disabled={regenerating} className="gap-1">
                {regenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                重新生成
              </Button>
            </>
          )}
        </div>
      </div>

      {editing && (
        <div className="mb-3">
          <label htmlFor="weekly-theme" className="block text-sm font-medium text-muted-foreground mb-1">
            本周主题
          </label>
          <input
            id="weekly-theme"
            type="text"
            value={draftTheme}
            onChange={(e) => setDraftTheme(e.target.value)}
            placeholder="输入本周主题"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}

      {isLoading && (
        <div className="py-12">
          <LoadingSpinner label="加载周报..." />
        </div>
      )}

      {error && !isLoading && (
        <ErrorFallback message={error.message || "该周报不存在"} />
      )}

      {!isLoading && !error && (
        editing ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full min-h-[60vh] rounded-lg border border-input bg-background p-4 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring resize-y font-mono"
            placeholder="支持 Markdown 语法"
          />
        ) : (
          <MarkdownRenderer content={content} />
        )
      )}
    </div>
  );
}
