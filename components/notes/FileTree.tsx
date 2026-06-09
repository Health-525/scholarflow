"use client";

import { useState, useEffect } from "react";
import { useGitHubClient } from "@/hooks/useGitHubClient";

interface TreeNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: TreeNode[];
  loaded?: boolean;
}

interface FileTreeProps {
  onSelect: (path: string) => void;
  activePath?: string;
}

export function FileTree({ onSelect, activePath }: FileTreeProps) {
  const client = useGitHubClient();
  const [roots, setRoots] = useState<TreeNode[]>([]);

  useEffect(() => {
    if (!client) return;
    client.listDirectory("content", "").then((entries) => {
      const nodes: TreeNode[] = entries
        .filter(
          (e) =>
            e.type === "dir" &&
            !e.name.startsWith(".") &&
            !e.name.startsWith("_") &&
            e.name !== "日报" &&
            e.name !== "周报" &&
            e.name !== "图片" &&
            e.name !== "public"
        )
        .map((e) => ({
          name: e.name,
          path: e.path,
          type: e.type as "dir",
          children: [],
          loaded: false,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setRoots(nodes);
    });
  }, [client]);

  async function toggleNode(node: TreeNode) {
    if (!client) return;

    if (node.loaded) {
      node.loaded = false;
      setRoots([...roots]);
      return;
    }

    const entries = await client.listDirectory("content", node.path);
    node.children = entries
      .filter((e) => !e.name.startsWith("."))
      .map((e) => ({
        name: e.name,
        path: e.path,
        type: e.type as "file" | "dir",
        children: [],
        loaded: false,
      }))
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    node.loaded = true;
    setRoots([...roots]);
  }

  return (
    <div className="py-2 text-[12px] font-mono select-none">
      {roots.map((node) => (
        <TreeNodeView
          key={node.path}
          node={node}
          depth={0}
          onToggle={toggleNode}
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
  onToggle,
  onSelect,
  activePath,
}: {
  node: TreeNode;
  depth: number;
  onToggle: (node: TreeNode) => void;
  onSelect: (path: string) => void;
  activePath?: string;
}) {
  const isExpanded = node.loaded && (node.children?.length ?? 0) > 0;
  const isDir = node.type === "dir";
  const isActive = activePath === node.path;

  const handleClick = () => {
    if (isDir) {
      onToggle(node);
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
      <div
        onClick={handleClick}
        className={`flex items-center gap-1 px-2 py-[3px] cursor-pointer transition-colors hover:bg-accent/5 ${
          isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        title={node.path}
      >
        {isDir && (
          <span
            className="w-4 text-center shrink-0 transition-transform text-muted-foreground text-[10px]"
            style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
          >
            ▶
          </span>
        )}
        {!isDir && <span className="w-4 shrink-0" />}

        <span className="shrink-0 text-xs">{getIcon()}</span>

        <span className="truncate">{node.name}</span>
      </div>

      {isExpanded &&
        node.children?.map((child) => (
          <TreeNodeView
            key={child.path}
            node={child}
            depth={depth + 1}
            onToggle={onToggle}
            onSelect={onSelect}
            activePath={activePath}
          />
        ))}
    </div>
  );
}
