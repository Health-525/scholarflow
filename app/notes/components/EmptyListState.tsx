import { FileText } from "lucide-react";

export function EmptyListState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-10 h-10 mx-auto mb-3 rounded-xl flex items-center justify-center bg-muted">
        <FileText className="w-4 h-4 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">还没有笔记</p>
      <p className="text-xs text-muted-foreground mt-1">点击右上角 + 开始记录</p>
    </div>
  );
}
