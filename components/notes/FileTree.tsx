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
    <div className="py-1 select-none">
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

  // 简洁图标：目录用箭头区分展开/折叠，文件统一用点
  const icon = isDir ? (isExpanded ? "▾" : "▸") : null;

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        className={`w-full text-left flex items-center gap-1.5 px-2 py-[5px] rounded-lg mx-1 transition-colors text-[13px] hover:bg-accent/8 ${
          isActive ? "bg-primary/10 text-primary font-medium" : "text-foreground"
        }`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        title={node.path}
      >
        {isDir ? (
          <span className="w-3 shrink-0 text-muted-foreground text-[11px]" aria-hidden="true">
            {icon}
          </span>
        ) : (
          <span className="w-3 shrink-0 flex items-center justify-center" aria-hidden="true">
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-primary" : "bg-muted-foreground/40"}`} />
          </span>
        )}
        <span className={`truncate ${isDir ? "font-medium text-foreground" : ""}`}>{node.name}</span>
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
