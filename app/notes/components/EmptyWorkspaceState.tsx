import { FileText, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyWorkspaceStateProps {
  onCreate: () => void;
  onUseSample: () => void;
}

export function EmptyWorkspaceState({ onCreate, onUseSample }: EmptyWorkspaceStateProps) {
  return (
    <Card className="h-full flex flex-col items-center justify-center hover:shadow-sm hover:translate-y-0">
      <CardContent className="text-center animate-fade-up max-w-[320px] px-6 py-12">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-primary/10">
          <FileText className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-[15px] font-semibold mb-1.5 text-foreground">选择一个笔记开始写作</h3>
        <p className="text-[12px] leading-relaxed text-muted-foreground mb-5">
          从左侧选择已有笔记，或创建一篇新笔记。不知道写什么？先看看示例。
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
          <Button onClick={onCreate} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> 新建笔记
          </Button>
          <Button onClick={onUseSample} variant="secondary" className="gap-1.5">
            <FileText className="w-3.5 h-3.5" /> 查看示例
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
