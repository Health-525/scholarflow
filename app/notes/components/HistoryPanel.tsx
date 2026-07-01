"use client";

import { Dialog } from "@base-ui/react/dialog";
import { AlertCircle, History, RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useNoteHistory } from "@/hooks/useNotes";
import { cn } from "@/lib/utils";

interface HistoryPanelProps {
  path: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestore: (content: string) => void;
}

function formatSavedAt(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function contentSnippet(content: string): string {
  return content.replace(/\s+/g, " ").trim().slice(0, 120);
}

export function HistoryPanel({ path, open, onOpenChange, onRestore }: HistoryPanelProps) {
  const { history, isLoading, error, load, restore } = useNoteHistory(path);
  const [restoringIndex, setRestoringIndex] = useState<number | null>(null);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const handleRestore = async (versionIndex: number, content: string) => {
    setRestoringIndex(versionIndex);
    try {
      await restore(versionIndex);
      onRestore(content);
      onOpenChange(false);
      toast.success("已恢复历史版本");
    } catch {
      toast.error("恢复失败，请重试");
    } finally {
      setRestoringIndex(null);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Popup className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-background border-l border-border shadow-lg outline-none flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-muted-foreground" />
              <Dialog.Title className="text-sm font-semibold text-foreground">历史版本</Dialog.Title>
            </div>
            <Dialog.Close render={<Button variant="ghost" size="icon-sm" className="h-8 w-8 rounded-lg hover:bg-muted" aria-label="关闭" />}>
              <X className="w-4 h-4" />
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive mb-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                加载失败，请重试
              </div>
            )}

            {isLoading && (
              <div className="space-y-3">
                <div className="h-16 bg-muted rounded-lg animate-pulse" />
                <div className="h-16 bg-muted rounded-lg animate-pulse" />
                <div className="h-16 bg-muted rounded-lg animate-pulse" />
              </div>
            )}

            {!isLoading && history.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <History className="w-8 h-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">暂无历史版本</p>
              </div>
            )}

            {!isLoading && history.length > 0 && (
              <div className="space-y-2">
                {history.map((entry) => (
                  <div
                    key={entry.versionIndex}
                    className="group rounded-lg border border-border bg-card p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-foreground">
                        {formatSavedAt(entry.savedAt)}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-7 gap-1 text-xs rounded-md"
                        disabled={restoringIndex === entry.versionIndex}
                        onClick={() => handleRestore(entry.versionIndex, entry.content)}
                      >
                        <RotateCcw className="w-3 h-3" />
                        {restoringIndex === entry.versionIndex ? "恢复中…" : "恢复"}
                      </Button>
                    </div>
                    <p className={cn("text-xs text-muted-foreground line-clamp-2", !contentSnippet(entry.content) && "italic")}>
                      {contentSnippet(entry.content) || "空版本"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
