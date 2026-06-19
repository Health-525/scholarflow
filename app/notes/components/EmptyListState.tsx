import { FileText, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyListStateProps {
  onCreate: () => void;
  onUseSample: () => void;
}

export function EmptyListState({ onCreate, onUseSample }: EmptyListStateProps) {
  return (
    <Card className="m-3 hover:shadow-sm hover:translate-y-0">
      <CardContent className="text-center py-10 px-4">
        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl flex items-center justify-center bg-primary/10">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <p className="text-[13px] font-medium text-foreground">还没有笔记</p>
        <p className="text-[11px] text-muted-foreground mt-1 mb-4">写下第一条想法，或从示例开始</p>
        <div className="flex flex-col gap-2">
          <Button onClick={onCreate} className="w-full gap-1.5">
            <Plus className="w-3.5 h-3.5" /> 新建笔记
          </Button>
          <Button onClick={onUseSample} variant="secondary" className="w-full gap-1.5">
            <FileText className="w-3.5 h-3.5" /> 查看示例笔记
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
