import { FileText } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export function EmptyWorkspaceState() {
  return (
    <Card className="h-full flex flex-col items-center justify-center hover:shadow-sm hover:translate-y-0">
      <CardContent className="text-center animate-fade-up max-w-xs px-6 py-12">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-primary/10">
          <FileText className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-base font-semibold mb-1.5 text-foreground">选择一个笔记开始写作</h3>
        <p className="text-xs leading-relaxed text-muted-foreground">
          从左侧选择已有笔记，或点击左上角 + 创建新笔记。
        </p>
      </CardContent>
    </Card>
  );
}
