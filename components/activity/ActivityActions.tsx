import { Download, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ActivityActionsProps {
  onExport: () => void;
  onClear: () => void;
}

export function ActivityActions({ onExport, onClear }: ActivityActionsProps) {
  return (
    <div className="flex gap-3 mb-8 border-t border-border pt-4 mt-6">
      <Button variant="outline" className="flex-1 h-9 gap-2" onClick={onExport}>
        <Download className="size-4" />
        导出 CSV
      </Button>
      <Button
        variant="ghost"
        className="h-9 gap-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors duration-150"
        onClick={onClear}
      >
        <Trash2 className="size-4" />
        清除数据
      </Button>
    </div>
  );
}
