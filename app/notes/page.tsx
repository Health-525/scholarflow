"use client";

import { FileText, PanelLeftOpen, Plus } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";

import { Sidebar, EmptyWorkspaceState } from "./components";
import { useNotesPage } from "./hooks/useNotesPage";

const Workspace = dynamic(
  () => import("./components/Workspace").then((m) => m.Workspace),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-xl bg-primary/10 motion-safe:animate-breathe" />
      </div>
    ),
  }
);

export default function NotesPage() {
  const {
    tree, treeLoading, treeError, reloadTree,
    selectedPath, setSelectedPath, sidebarOpen, setSidebarOpen,
    handleCreate, handleSelect,
    workspaceProps,
  } = useNotesPage();

  const isMobile = useIsMobile();

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Don't trigger shortcuts when typing in inputs
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        handleCreate();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "\\") {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
        return;
      }
      if (e.key === "/") {
        e.preventDefault();
        // Focus the search input in the sidebar
        const input = document.querySelector<HTMLInputElement>('[data-notes-search]');
        input?.focus();
        return;
      }
      if (e.key === "Escape" && selectedPath) {
        e.preventDefault();
        setSelectedPath(null);
        return;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleCreate, setSidebarOpen, selectedPath, setSelectedPath]);

  const sidebar = (
    <Sidebar
      tree={tree}
      isLoading={treeLoading}
      error={treeError}
      onReload={reloadTree}
      selectedPath={selectedPath}
      onSelect={handleSelect}
      onCreate={handleCreate}
      onClose={() => setSidebarOpen(false)}
    />
  );

  // Mobile: full-screen sidebar or workspace
  if (isMobile) {
    return (
      <ErrorBoundary>
      <div className="h-full w-full overflow-hidden">
        <div className="h-full" key={selectedPath ? "ws" : "sb"}>
        {selectedPath ? (
          <div className="h-full bg-background">
            <Workspace {...workspaceProps} />
          </div>
        ) : (
          <div className="h-full flex flex-col bg-sidebar">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-background sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-medium text-foreground">笔记</h2>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={handleCreate} aria-label="新建笔记">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {sidebar}
            </div>
          </div>
        )}
        </div>
      </div>
      </ErrorBoundary>
    );
  }

  // Desktop: two-column layout
  return (
    <ErrorBoundary>
    <div className="flex h-full w-full overflow-hidden">
      <div className={cn(
        "shrink-0 h-full transition-[width] duration-300 ease-out overflow-hidden",
        sidebarOpen ? "w-72" : "w-0 border-r-0"
      )}>
        {sidebar}
      </div>
      <main key={selectedPath || "empty"} className="relative flex-1 min-w-0 h-full bg-background overflow-hidden border-l border-border">
        {!sidebarOpen && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSidebarOpen(true)}
            aria-label="展开侧边栏"
            className="absolute top-3 left-3 z-20 h-9 w-9 text-muted-foreground hover:text-primary hover:bg-sidebar-accent shadow-sm rounded-lg"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </Button>
        )}
        {selectedPath ? (
          <Workspace {...workspaceProps} />
        ) : (
          <EmptyWorkspaceState onCreate={handleCreate} />
        )}
      </main>
    </div>
    </ErrorBoundary>
  );
}
