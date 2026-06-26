import { FileText, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

interface EmptyWorkspaceStateProps {
  onCreate?: () => void;
}

export function EmptyWorkspaceState({ onCreate }: EmptyWorkspaceStateProps) {
  return (
    <div className="max-w-2xl mx-auto w-full h-full flex flex-col">
      <div className="rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 shadow-sm h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center bg-amber-100 dark:bg-amber-900">
          <FileText className="w-5 h-5 text-amber-700 dark:text-amber-300" />
        </div>
        <h3 className="text-base font-semibold text-amber-950 dark:text-amber-50 mb-1">
          选一张便签开始写
        </h3>
        <p className="text-sm text-amber-700/70 dark:text-amber-300/70 mb-4">
          从左侧列表选择，或点击下方按钮新建。
        </p>
        {onCreate && (
          <Button onClick={onCreate} className="gap-1.5">
            <Plus className="w-4 h-4" /> 新建笔记
          </Button>
        )}
      </div>
    </div>
  );
}
