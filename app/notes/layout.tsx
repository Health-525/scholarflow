"use client";

import { useRouter } from "next/navigation";
import { FileTree } from "@/components/notes/FileTree";

export default function NotesLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  function handleSelect(path: string) {
    router.push(`/notes/${encodeURIComponent(path)}`);
  }

  // Extract active path from URL
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";
  const activePath = pathname.startsWith("/notes/")
    ? decodeURIComponent(pathname.replace("/notes/", ""))
    : undefined;

  return (
    <div className="flex h-[calc(100vh-0px)]">
      {/* File tree sidebar */}
      <aside
        className="w-64 shrink-0 overflow-y-auto border-r hidden md:block"
        style={{
          backgroundColor: "var(--surface-elevated)",
          borderColor: "var(--border-subtle)",
        }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--text-muted)" }}
        >
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
