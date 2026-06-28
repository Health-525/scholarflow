import { FileText, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

interface EmptyWorkspaceStateProps {
  onCreate?: () => void;
}

export function EmptyWorkspaceState({ onCreate }: EmptyWorkspaceStateProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-background to-muted/30">
      <FileText className="w-8 h-8 text-notes-placeholder mb-5 animate-breathe" />
      <p className="text-sm text-notes-tertiary mb-6">选一篇笔记，或者新建一张白纸</p>
      {onCreate && (
        <Button
          onClick={onCreate}
          variant="secondary"
          title="新建笔记 (Ctrl+N)"
          className="gap-1.5 bg-primary text-primary-foreground hover:bg-notes-primary-hover border-0 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
        >
          <Plus className="w-4 h-4" /> 新建笔记
        </Button>
      )}
    </div>
  );
}
