import { FileText } from "lucide-react";

export function EmptyWorkspaceState() {
  return (
    <div className="max-w-2xl mx-auto w-full h-full flex flex-col">
      <div className="rounded-2xl bg-amber-50 dark:bg-amber-950 shadow-md border border-amber-100 dark:border-amber-900 h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center bg-amber-100 dark:bg-amber-900">
          <FileText className="w-5 h-5 text-amber-700 dark:text-amber-300" />
        </div>
        <h3 className="text-base font-semibold text-amber-950 dark:text-amber-50 mb-1">
          选一张便签开始写
        </h3>
        <p className="text-sm text-amber-700/70 dark:text-amber-300/70">
          从左侧列表选择，或点击左上角 + 新建。
        </p>
      </div>
    </div>
  );
}
