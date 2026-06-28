"use client";

import { AlertCircle, FileText, PanelLeftClose, Plus, Search, X } from "lucide-react";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";

import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/ui/skeleton";
import { useNoteSearch } from "@/hooks/useNotes";
import { cn } from "@/lib/utils";
import type { NoteTreeNode } from "@/types";

import { NoteTree } from "./NoteTree";

interface SidebarProps {
  tree: NoteTreeNode[];
  isLoading: boolean;
  error: Error | null;
  onReload: () => void;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onCreate: () => void;
  onClose: () => void;
}

export function Sidebar({
  tree,
  isLoading,
  error,
  onReload,
  selectedPath,
  onSelect,
  onCreate,
  onClose,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const { results, isSearching, search, clear } = useNoteSearch();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const prevResultsRef = useRef<typeof results>([]);

  // Keep previous results visible during re-search to avoid flicker
  const displayResults = isSearching && prevResultsRef.current.length > 0
    ? prevResultsRef.current
    : results;
  useEffect(() => { if (results.length > 0) prevResultsRef.current = results; }, [results]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      clearTimeout(debounceRef.current);
      if (!value.trim()) {
        clear();
        setIsTyping(false);
        return;
      }
      setIsTyping(true);
      debounceRef.current = setTimeout(() => { search(value); setIsTyping(false); }, 200);
    },
    [search, clear]
  );

  useEffect(() => {
    if (showSearch) searchInputRef.current?.focus();
  }, [showSearch]);

  const { pinnedNodes, normalNodes } = useMemo(() => {
    const pinned: NoteTreeNode[] = [];
    const normal: NoteTreeNode[] = [];
    function split(nodes: NoteTreeNode[]) {
      for (const node of nodes) {
        if (node.type === "file" && node.pinned) pinned.push(node);
        else if (node.type === "dir") normal.push(node);
        else normal.push(node);
      }
    }
    split(tree);
    return { pinnedNodes: pinned, normalNodes: normal };
  }, [tree]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="px-3 py-4">
          <ListSkeleton count={6} />
        </div>
      );
    }
    if (error) {
      return (
        <div className="px-3 py-8 text-center">
          <AlertCircle className="w-4 h-4 mx-auto mb-2 text-destructive/70" />
          <p className="text-xs text-destructive mb-3">加载失败</p>
          <Button variant="secondary" size="sm" className="rounded-lg" onClick={onReload}>
            重试
          </Button>
        </div>
      );
    }

    if (searchQuery.trim()) {
      if (isTyping && prevResultsRef.current.length === 0) {
        return (
          <div className="px-3 py-4 text-center text-xs text-muted-foreground">
            输入中…
          </div>
        );
      }
      if (!isTyping && results.length === 0) {
        return (
          <div className="px-3 py-8 text-center">
            <p className="text-xs text-muted-foreground">未找到匹配的笔记</p>
          </div>
        );
      }
      return (
        <div className="animate-fade-up space-y-0.5">
          {isTyping && (
            <div className="px-3 py-1.5 text-[10px] text-notes-tertiary">
              搜索中…
            </div>
          )}
          {displayResults.map((r) => (
            <button
              key={r.path}
              type="button"
              onClick={() => {
                onSelect(r.path);
                setSearchQuery("");
                clear();
              }}
              className={cn(
                "w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors",
                selectedPath === r.path
                  ? "bg-notes-active-bg text-primary font-medium"
                  : "text-foreground/80 hover:bg-sidebar-accent"
              )}
            >
              <span className="block leading-snug truncate">{r.title}</span>
              <span
                className="search-snippet block text-xs text-muted-foreground/50 mt-0.5 line-clamp-1"
                dangerouslySetInnerHTML={{ __html: r.snippet }}
              />
            </button>
          ))}
        </div>
      );
    }

    if (tree.length === 0) {
      return (
        <div className="px-3 py-12 text-center">
          <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground">还没有笔记</p>
          <Button variant="link" size="sm" onClick={onCreate} className="mt-2 rounded-lg transition-colors">
            新建第一篇
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {pinnedNodes.length > 0 && (
          <div>
            <div className="px-2 py-1 text-[11px] font-medium text-notes-tertiary uppercase tracking-wider">
              已固定
            </div>
            <NoteTree
              nodes={pinnedNodes}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          </div>
        )}
        <NoteTree
          nodes={normalNodes}
          selectedPath={selectedPath}
          onSelect={onSelect}
        />
      </div>
    );
  };

  return (
    <aside className="w-72 shrink-0 flex flex-col h-full border-r border-border bg-sidebar">
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
            <h2 className="text-sm font-medium text-foreground truncate">笔记</h2>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowSearch(!showSearch)}
              aria-label="搜索"
            >
              <Search className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onCreate}
              aria-label="新建笔记"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="收起侧边栏"
            >
              <PanelLeftClose className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {showSearch && (
          <div className="mt-2 relative animate-slide-down">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="搜索笔记…"
              className="w-full h-8 pl-7 pr-6 text-xs bg-white rounded-md border border-border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-notes-tertiary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  clear();
                }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2"
              >
                <X className="w-3 h-3 text-muted-foreground/50 hover:text-foreground" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2">{renderContent()}</div>
    </aside>
  );
}
