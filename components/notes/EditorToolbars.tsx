"use client";

import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import {
  Eye, FileDown, FileUp, MoreHorizontal, PenLine, Pin, Trash2,
} from "lucide-react";
import { useState } from "react";

import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

import { CommonToolbar } from "./EditorToolbar";
import { ToolbarButton, ToolbarGroup, ToolbarDivider } from "./Toolbar";

interface SharedProps {
  editor: Editor;
  onInsertImage: () => void;
  viewMode?: "edit" | "view";
  onViewModeChange?: (mode: "edit" | "view") => void;
  onDelete?: () => void;
  onExportMarkdown: () => void;
  onExportWechat: () => void;
  onImportClick: () => void;
  pinned?: boolean;
  onTogglePin?: () => void;
}

function ExportImportMenu({ onExportMarkdown, onExportWechat, onImportClick }: Pick<SharedProps, "onExportMarkdown" | "onExportWechat" | "onImportClick">) {
  const [open, setOpen] = useState(false);

  const handle = (fn: () => void) => () => { setOpen(false); setTimeout(fn, 0); };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="h-8 w-8 rounded-md inline-flex items-center justify-center text-muted-foreground hover:bg-sidebar-accent hover:text-primary transition-colors"
        aria-label="更多" title="更多">
        <MoreHorizontal className="w-4 h-4" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-52 p-1.5">
        <div className="space-y-0.5">
          <button type="button" onClick={handle(onExportMarkdown)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-xl text-foreground/80 hover:bg-sidebar-accent hover:text-primary">
            <FileDown className="w-4 h-4" /> 导出 Markdown
          </button>
          <button type="button" onClick={handle(onExportWechat)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-xl text-foreground/80 hover:bg-sidebar-accent hover:text-primary">
            <FileDown className="w-4 h-4" /> 导出公众号文章
          </button>
          <button type="button" onClick={handle(onImportClick)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-xl text-foreground/80 hover:bg-sidebar-accent hover:text-primary">
            <FileUp className="w-4 h-4" /> 导入 Markdown
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ActionGroup({ viewMode, onViewModeChange, onDelete, pinned, onTogglePin }: Omit<SharedProps, "editor" | "onInsertImage" | "onExportMarkdown" | "onExportWechat" | "onImportClick">) {
  if (!onViewModeChange && !onDelete && !onTogglePin) return null;
  return (
    <ToolbarGroup>
      {onTogglePin && (
        <ToolbarButton label={pinned ? "取消固定" : "固定"} icon={Pin} active={pinned} onClick={onTogglePin} />
      )}
      {onViewModeChange && (
        <ToolbarButton label={viewMode === "view" ? "编辑" : "预览"} icon={viewMode === "view" ? PenLine : Eye}
          onClick={() => onViewModeChange(viewMode === "view" ? "edit" : "view")} />
      )}
      {onDelete && <ToolbarButton label="删除笔记" icon={Trash2} onClick={onDelete} />}
    </ToolbarGroup>
  );
}

export function BubbleToolbar({ editor, onInsertImage }: { editor: Editor; onInsertImage: () => void }) {
  return (
    <BubbleMenu editor={editor} className="hidden md:flex items-center gap-0.5 bg-background border border-border shadow-lg rounded-xl px-1 py-1">
      <CommonToolbar editor={editor} onInsertImage={onInsertImage} />
    </BubbleMenu>
  );
}

export function DesktopToolbar(props: SharedProps) {
  const { editor, onInsertImage, viewMode, onViewModeChange, onDelete, onExportMarkdown, onExportWechat, onImportClick, pinned, onTogglePin } = props;
  return (
    <div className="hidden md:flex flex-wrap items-center gap-0.5 px-1 py-1.5 mb-4 bg-background sticky top-0 z-10 border-b border-border shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <CommonToolbar editor={editor} onInsertImage={onInsertImage} />
      <ToolbarDivider />
      <ActionGroup viewMode={viewMode} onViewModeChange={onViewModeChange} onDelete={onDelete} pinned={pinned} onTogglePin={onTogglePin} />
      <ToolbarDivider />
      <ExportImportMenu onExportMarkdown={onExportMarkdown} onExportWechat={onExportWechat} onImportClick={onImportClick} />
    </div>
  );
}

export function MobileToolbar(props: SharedProps) {
  const { editor, onInsertImage, viewMode, onViewModeChange, onDelete, onExportMarkdown, onExportWechat, onImportClick, pinned, onTogglePin } = props;
  return (
    <div className="flex md:hidden flex-nowrap items-center gap-0.5 py-2 pb-1 mb-2 border-b border-border overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:w-0">
      <CommonToolbar editor={editor} onInsertImage={onInsertImage} />
      <ToolbarDivider />
      <ActionGroup viewMode={viewMode} onViewModeChange={onViewModeChange} onDelete={onDelete} pinned={pinned} onTogglePin={onTogglePin} />
      <ToolbarDivider />
      <ExportImportMenu onExportMarkdown={onExportMarkdown} onExportWechat={onExportWechat} onImportClick={onImportClick} />
    </div>
  );
}
