"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";
import { FileTree } from "@/components/notes/FileTree";

export default function NotesLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const handleSelect = useCallback((path: string) => {
    router.push(`/notes/${encodeURIComponent(path)}`);
  }, [router]);

  const activePath = pathname.startsWith("/notes/")
    ? decodeURIComponent(pathname.replace("/notes/", ""))
    : undefined;

  return (
    <div className="flex h-[calc(100vh-0px)]">
      {/* File tree sidebar */}
      <aside className="w-64 shrink-0 overflow-y-auto border-r border-border bg-card hidden md:block">
        {/* Header */}
        <div className="px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          资源管理器
        </div>

        <FileTree onSelect={handleSelect} activePath={activePath} />
      </aside>

      {/* Content area */}
      <main className="flex-1 overflow-y-auto min-w-0">
        {children}
      </main>
    </div>
  );
}
