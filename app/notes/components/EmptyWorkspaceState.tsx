import { FileText, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

interface EmptyWorkspaceStateProps {
  onCreate?: () => void;
}

export function EmptyWorkspaceState({ onCreate }: EmptyWorkspaceStateProps) {
  return (
    <div className="max-w-3xl mx-auto w-full h-full flex flex-col items-center justify-center p-8 text-center">
      <div className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center bg-muted">
        <FileText className="w-5 h-5 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold mb-1">选一篇文档开始写</h3>
      <p className="text-sm text-muted-foreground mb-4">
        从左侧列表选择，或点击下方按钮新建。
      </p>
      {onCreate && (
        <Button onClick={onCreate} className="gap-1.5">
          <Plus className="w-4 h-4" /> 新建笔记
        </Button>
      )}
    </div>
  );
}
