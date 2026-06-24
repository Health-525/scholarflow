import { FileText, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyListStateProps {
  onCreate: () => void;
}

export function EmptyListState({ onCreate }: EmptyListStateProps) {
  return (
    <Card className="m-3 hover:shadow-sm hover:translate-y-0">
      <CardContent className="text-center py-10 px-4">
        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl flex items-center justify-center bg-primary/10">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <p className="text-[13px] font-medium text-foreground">还没有笔记</p>
        <p className="text-[11px] text-muted-foreground mt-1 mb-4">写下第一条想法</p>
        <Button onClick={onCreate} className="w-full gap-1.5">
          <Plus className="w-3.5 h-3.5" /> 新建笔记
        </Button>
      </CardContent>
    </Card>
  );
}
