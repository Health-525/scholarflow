"use client";

import { ChevronRight, FileText, Folder, FolderOpen, Pin } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import type { NoteTreeNode } from "@/types";

const COLLAPSED_KEY = "scholarflow:notes-collapsed-dirs";

function loadCollapsed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(COLLAPSED_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { /* ignore */ }
  return new Set();
}

function saveCollapsed(set: Set<string>) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...set])); } catch { /* ignore */ }
}

function countFiles(nodes: NoteTreeNode[]): number {
  let count = 0;
  for (const node of nodes) {
    if (node.type === "file") count += 1;
    if (node.children) count += countFiles(node.children);
  }
  return count;
}

interface NoteTreeProps {
  nodes: NoteTreeNode[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
  level?: number;
}

function expandAncestors(path: string) {
  const s = loadCollapsed();
  const parts = path.split("/");
  let changed = false;
  for (let i = parts.length - 1; i > 0; i--) {
    const dirPath = parts.slice(0, i).join("/");
    if (s.delete(dirPath)) changed = true;
  }
  if (changed) saveCollapsed(s);
}

export function NoteTree({ nodes, selectedPath, onSelect, level = 0 }: NoteTreeProps) {
  useEffect(() => {
    if (selectedPath) expandAncestors(selectedPath);
  }, [selectedPath]);
  return (
    <div className={cn(level === 0 ? "" : "ml-3")}>
      {nodes.map((node) => (
        <NoteTreeItem
          key={node.path}
          node={node}
          selectedPath={selectedPath}
          onSelect={onSelect}
          level={level}
        />
      ))}
    </div>
  );
}

function NoteTreeItem({
  node,
  selectedPath,
  onSelect,
  level,
}: {
  node: NoteTreeNode;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  level: number;
}) {
  const [collapsedSet, setCollapsedSet] = useState<Set<string>>(() => loadCollapsed());
  const [expanded, setExpanded] = useState(!collapsedSet.has(node.path));
  const itemRef = useRef<HTMLButtonElement>(null);
  const isDir = node.type === "dir";
  const isSelected = node.path === selectedPath;

  useEffect(() => {
    const s = loadCollapsed();
    setExpanded(!s.has(node.path));
  }, [node.path]);

  const toggleDir = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev;
      const s = loadCollapsed();
      if (next) s.delete(node.path);
      else s.add(node.path);
      saveCollapsed(s);
      setCollapsedSet(s);
      return next;
    });
  }, [node.path]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (isDir) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleDir();
        }
        if (e.key === "ArrowRight" && !expanded) {
          e.preventDefault();
          toggleDir();
        }
        if (e.key === "ArrowLeft" && expanded) {
          e.preventDefault();
          toggleDir();
        }
      } else {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(node.path);
        }
      }
    },
    [isDir, expanded, toggleDir, onSelect, node.path]
  );

  const isAncestorOfSelected = isDir && selectedPath && selectedPath.startsWith(node.path + "/");

  if (isDir) {
    return (
      <div>
        <button
          ref={itemRef}
          type="button"
          onClick={toggleDir}
          onKeyDown={handleKeyDown}
          title={`${expanded ? "折叠" : "展开"} ${node.name}`}
          className={cn(
            "w-full group flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors",
            isAncestorOfSelected
              ? "text-primary bg-notes-active-bg/50"
              : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
          )}
        >
          <ChevronRight
            className={cn("w-3 h-3 transition-transform duration-200 shrink-0", expanded && "rotate-90")}
          />
          {expanded ? (
            <FolderOpen className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <Folder className="w-3.5 h-3.5 shrink-0" />
          )}
          <span className="truncate">{node.name}</span>
          {node.children && node.children.length > 0 && (
            <span className="ml-auto bg-border text-notes-tertiary rounded-full px-1.5 py-0 text-[10px] leading-none shrink-0">
              {countFiles(node.children)}
            </span>
          )}
        </button>
        {expanded && node.children && (
          <NoteTree
            nodes={node.children}
            selectedPath={selectedPath}
            onSelect={onSelect}
            level={level + 1}
          />
        )}
      </div>
    );
  }

  return (
    <button
      ref={itemRef}
      type="button"
      onClick={() => onSelect(node.path)}
      onKeyDown={handleKeyDown}
      title={node.name}
      className={cn(
        "w-full flex items-center gap-2.5 px-2 py-1.5 text-sm rounded transition-colors text-left border-l-[3px]",
        isSelected
          ? "bg-notes-active-bg text-primary font-medium border-l-primary"
          : "text-foreground/70 hover:bg-sidebar-accent hover:text-foreground border-l-transparent"
      )}
    >
      <FileText className="w-3.5 h-3.5 shrink-0 text-notes-tertiary" />
      <span className="truncate flex-1">{node.name.replace(/\.md$/i, "")}</span>
      {node.pinned && <Pin className="w-3 h-3 shrink-0 text-notes-pin/70" />}
    </button>
  );
}
