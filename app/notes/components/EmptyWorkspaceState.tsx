import { FileText, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

interface EmptyWorkspaceStateProps {
  onCreate?: () => void;
}

export function EmptyWorkspaceState({ onCreate }: EmptyWorkspaceStateProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center">
      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
        <FileText className="w-6 h-6 text-muted-foreground/50" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">没有打开的笔记</p>
      <p className="text-xs text-muted-foreground mb-6">从左侧选择一篇，或者新建一张白纸</p>
      {onCreate && (
        <Button
          onClick={onCreate}
          variant="secondary"
          size="sm"
          title="新建笔记 (Ctrl+N)"
          className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 border-0 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> 新建笔记
        </Button>
      )}
    </div>
  );
}
