import { FileText, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

interface EmptyWorkspaceStateProps {
  onCreate?: () => void;
}

export function EmptyWorkspaceState({ onCreate }: EmptyWorkspaceStateProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center">
      <FileText className="w-8 h-8 text-muted-foreground/30 mb-4" />
      <p className="text-sm text-muted-foreground/80 mb-5">选一篇笔记，或者新建一张白纸</p>
      {onCreate && (
        <Button onClick={onCreate} variant="secondary" className="gap-1.5 bg-muted/60 hover:bg-muted">
          <Plus className="w-4 h-4" /> 新建笔记
        </Button>
      )}
    </div>
  );
}
