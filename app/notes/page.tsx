"use client";

import { FileText, PanelLeftOpen, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useIsMobile } from "@/hooks/useIsMobile";

import { Sidebar, EmptyWorkspaceState, Workspace } from "./components";
import { useNotesPage } from "./hooks/useNotesPage";

export default function NotesPage() {
  const {
    tree, treeLoading, treeError, reloadTree,
    selectedPath, sidebarOpen, setSidebarOpen,
    handleCreate, handleSelect,
    workspaceProps,
  } = useNotesPage();

  const isMobile = useIsMobile();

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
      <div className="h-full w-full -mx-4 -mb-20 overflow-hidden">
        <div className="animate-fade-up h-full" key={selectedPath ? "ws" : "sb"}>
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
    <div className="flex h-full w-full -mx-4 md:-mx-6 lg:-mx-8 -mb-20 md:mb-0 overflow-hidden">
      {sidebarOpen && (
        <div className="w-72 shrink-0 h-full transition-all duration-300 ease-out overflow-hidden">
          {sidebar}
        </div>
      )}
      <main key={selectedPath || "empty"} className="relative flex-1 min-w-0 h-full bg-background overflow-hidden border-l border-border">
        {!sidebarOpen && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSidebarOpen(true)}
            aria-label="展开侧边栏"
            className="absolute top-3 left-3 z-20 h-9 w-9 text-notes-tertiary hover:text-primary hover:bg-sidebar-accent animate-fade-in shadow-sm rounded-xl"
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
