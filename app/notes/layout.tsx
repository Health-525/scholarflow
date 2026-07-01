export default function NotesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="notes-flybook h-full">
      <style>{`
        /* ── 笔记模块作用域变量（跟随全局主题，不再硬编码飞书蓝） ── */
        .notes-flybook {
          /* notes-specific 语义色，直接复用全局 token，自动跟随亮/暗主题 */
          --notes-active-bg: var(--sidebar-accent);
          --notes-active-text: var(--primary);
          --notes-hover-bg: var(--sidebar-accent);
          --notes-tertiary: var(--muted-foreground);
          --notes-placeholder: color-mix(in srgb, var(--muted-foreground) 50%, transparent);
          --notes-pin: var(--status-warning);
          --notes-primary-hover: color-mix(in srgb, var(--primary) 85%, black);
        }

        /* 搜索结果高亮 — 跟随主题色 */
        .notes-flybook .search-snippet mark {
          background: color-mix(in srgb, var(--primary) 15%, transparent);
          color: var(--primary);
          font-weight: 600;
          border-radius: 2px;
          padding: 0 1px;
        }
      `}</style>
      {children}
    </div>
  );
}
