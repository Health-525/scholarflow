"use client";

import { useState } from "react";

import { useNoteTree } from "@/hooks/useNotes";

interface FileTreeProps {
  onSelect: (path: string) => void;
  activePath?: string;
}

export function FileTree({ onSelect, activePath }: FileTreeProps) {
  const { tree, isLoading, error, reload } = useNoteTree();

  if (isLoading) {
    return (
      <div className="px-4 py-6 text-center">
        <div className="w-6 h-6 mx-auto rounded-lg bg-primary/10 animate-breathe" />
        <p className="mt-2 text-[11px] text-muted-foreground">加载中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-[11px] text-destructive">加载失败</p>
        <button
          onClick={reload}
          className="mt-2 text-[11px] text-primary hover:underline"
        >
          重试
        </button>
      </div>
    );
  }

  if (tree.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-[11px] text-muted-foreground">暂无笔记</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">点击上方按钮创建</p>
      </div>
    );
  }

  return (
    <div className="py-2 text-[12px] font-mono select-none">
      {tree.map((node) => (
        <TreeNodeView
          key={node.path}
          node={node}
          depth={0}
          onSelect={onSelect}
          activePath={activePath}
        />
      ))}
    </div>
  );
}

function TreeNodeView({
  node,
  depth,
  onSelect,
  activePath,
}: {
  node: {
    name: string;
    path: string;
    type: "file" | "dir";
    children?: { name: string; path: string; type: "file" | "dir"; children?: unknown[] }[];
  };
  depth: number;
  onSelect: (path: string) => void;
  activePath?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const isDir = node.type === "dir";
  const isActive = activePath === node.path;

  const handleClick = () => {
    if (isDir) {
      setIsExpanded((v) => !v);
    } else {
      onSelect(node.path);
    }
  };

  const getIcon = () => {
    if (isDir) return isExpanded ? "📂" : "📁";
    const ext = node.name.split(".").pop()?.toLowerCase();
    if (ext === "md") return "📝";
    if (ext === "png" || ext === "jpg" || ext === "jpeg" || ext === "gif") return "🖼";
    if (ext === "py") return "🐍";
    if (ext === "js" || ext === "ts") return "📜";
    return "📄";
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        className={`w-full text-left flex items-center gap-1 px-2 py-[3px] transition-colors hover:bg-accent/5 ${
          isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        title={node.path}
      >
        {isDir && (
          <span
            className="w-4 text-center shrink-0 transition-transform text-muted-foreground text-[10px]"
            style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
            aria-hidden="true"
          >
            ▶
          </span>
        )}
        {!isDir && <span className="w-4 shrink-0" />}
        <span className="shrink-0 text-xs">{getIcon()}</span>
        <span className="truncate">{node.name}</span>
      </button>
      {isExpanded &&
        node.children?.map((child) => (
          <TreeNodeView
            key={child.path}
            node={child as { name: string; path: string; type: "file" | "dir"; children?: { name: string; path: string; type: "file" | "dir" }[] }}
            depth={depth + 1}
            onSelect={onSelect}
            activePath={activePath}
          />
        ))}
    </div>
  );
}
