import { FileText } from "lucide-react";

export function EmptyListState() {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
      <FileText className="w-6 h-6 text-muted-foreground/40 mb-3" />
      <p className="text-sm text-muted-foreground/80">还没有笔记</p>
    </div>
  );
}
